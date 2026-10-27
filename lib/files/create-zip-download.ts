import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DocumentStorageType } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import JSZip from "jszip";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { ONE_DAY, ONE_HOUR, ONE_SECOND } from "@/lib/constants";
import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { getFile } from "@/lib/files/get-file";

// Replaces the AWS Lambda zip creator, which doesn't exist on self-hosted
// MinIO. Takes the same folderStructure payload the Lambda did and returns a
// presigned download url for the created zip.

const ZIP_PREFIX = "bulk-downloads";

export type ZipFolderStructure = {
  [path: string]: {
    name: string;
    path: string;
    files: {
      name: string;
      key: string;
      type?: string;
      numPages?: number;
      needsWatermark?: boolean;
    }[];
  };
};

export type ZipWatermark = {
  config: unknown;
  viewerData: {
    email: string | null;
    date: string;
    time: string;
    link: string | null;
    ipAddress: string;
  };
};

export const createZipDownloadUrl = async ({
  teamId,
  zipName,
  folderStructure,
  watermark,
}: {
  teamId: string;
  zipName: string;
  folderStructure: ZipFolderStructure;
  watermark?: ZipWatermark;
}): Promise<string> => {
  const { client, bucket } = await getTeamS3ClientAndConfig(teamId);

  try {
    await deleteExpiredZips(client, bucket, teamId);
  } catch (error) {
    console.error("Failed to clean up old bulk download zips:", error);
  }

  const zip = new JSZip();
  // keyed by zip folder path, as differently named dataroom folders can
  // sanitize to the same zip folder
  const usedNamesByFolder = new Map<string, Set<string>>();

  for (const folder of Object.values(folderStructure)) {
    const folderPath = getZipFolderPath(folderStructure, folder.path);
    if (folderPath) {
      zip.folder(folderPath);
    }

    if (!usedNamesByFolder.has(folderPath)) {
      usedNamesByFolder.set(folderPath, new Set<string>());
    }
    const usedNames = usedNamesByFolder.get(folderPath)!;

    // empty folders are passed as a file with an empty name and key
    for (const file of folder.files.filter((file) => file.key)) {
      const needsWatermark = !!watermark && !!file.needsWatermark;

      // Only PDFs can be watermarked here, never hand out other watermarkable
      // files (images) as unwatermarked originals
      if (needsWatermark && file.type !== "pdf") {
        console.warn(`Leaving ${file.key} out of zip, cannot watermark it`);
        continue;
      }

      const fileName = getUniqueName(
        needsWatermark
          ? getNameWithExtension(file.name, ".pdf")
          : getNameWithExtension(file.name, path.extname(file.key)),
        usedNames,
      );
      const data = needsWatermark
        ? await getWatermarkedPdf(file, watermark!)
        : await getObjectBytes(client, bucket, file.key);

      zip.file(folderPath ? `${folderPath}/${fileName}` : fileName, data);
    }
  }

  const zipFileName = `${slugify(zipName) || "dataroom"}.zip`;
  const key = `${teamId}/${ZIP_PREFIX}/${randomUUID()}/${zipFileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
      }),
      ContentType: "application/zip",
    }),
  );

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${zipFileName}"`,
    }),
    { expiresIn: ONE_HOUR / ONE_SECOND },
  );
};

// "/a/b" -> "<name of /a>/<name of /b>", root "/" -> ""
const getZipFolderPath = (
  folderStructure: ZipFolderStructure,
  folderPath: string,
) => {
  let currentPath = "";
  return folderPath
    .split("/")
    .filter(Boolean)
    .map((part) => {
      currentPath += "/" + part;
      return sanitizeName(folderStructure[currentPath]?.name ?? part);
    })
    .join("/");
};

// Names end up as zip entry paths, so no separators or relative path parts
const sanitizeName = (name: string) => {
  const sanitized = name.replace(/[/\\]/g, "-").trim();
  return sanitized === "." || sanitized === ".." ? "_" : sanitized;
};

const getNameWithExtension = (name: string, extension: string) => {
  const sanitized = sanitizeName(name) || "document";
  if (!extension) return sanitized;
  return sanitized.toLowerCase().endsWith(extension.toLowerCase())
    ? sanitized
    : `${sanitized}${extension}`;
};

// Two documents with the same name in a folder would overwrite each other
const getUniqueName = (name: string, usedNames: Set<string>) => {
  const { name: base, ext } = path.parse(name);
  let uniqueName = name;
  for (let i = 1; usedNames.has(uniqueName.toLowerCase()); i++) {
    uniqueName = `${base} (${i})${ext}`;
  }
  usedNames.add(uniqueName.toLowerCase());
  return uniqueName;
};

const getObjectBytes = async (
  client: S3Client,
  bucket: string,
  key: string,
) => {
  const { Body } = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!Body) {
    throw new Error(`Got an empty body from s3 for ${key}`);
  }
  return Body.transformToByteArray();
};

const getWatermarkedPdf = async (
  file: ZipFolderStructure[string]["files"][number],
  watermark: ZipWatermark,
) => {
  // annotate-document watermarks numPages pages, without it the PDF would be
  // returned untouched
  if (!file.numPages) {
    throw new Error(`Cannot watermark ${file.key}, page count is missing`);
  }

  const url = await getFile({
    type: DocumentStorageType.S3_PATH,
    data: file.key,
    isDownload: true,
  });

  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/mupdf/annotate-document`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        numPages: file.numPages,
        watermarkConfig: watermark.config,
        originalFileName: file.name,
        viewerData: watermark.viewerData,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to watermark ${file.name}`);
  }

  return new Uint8Array(await response.arrayBuffer());
};

// Zips are only needed for the lifetime of the presigned url
const deleteExpiredZips = async (
  client: S3Client,
  bucket: string,
  teamId: string,
) => {
  const { Contents } = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${teamId}/${ZIP_PREFIX}/`,
    }),
  );

  const expired = (Contents ?? []).filter(
    (object) =>
      object.Key &&
      object.LastModified &&
      object.LastModified.getTime() < Date.now() - ONE_DAY,
  );

  for (const object of expired) {
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: object.Key! }),
    );
  }
};
