import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "@/lib/files/aws-client";

import { CustomUser } from "@/lib/types";
import { authOptions } from "../auth/[...nextauth]";

const s3 = getS3Client();

const uploadConfig = {
  profile: {
    allowedContentTypes: ["image/png", "image/jpg", "image/jpeg"],
    maximumSizeInBytes: 2 * 1024 * 1024, // 2MB
  },
  assets: {
    allowedContentTypes: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/x-icon",
      "image/ico",
    ],
    maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const type = Array.isArray(req.query.type)
    ? req.query.type[0]
    : req.query.type;

  if (!type || !(type in uploadConfig)) {
    return res.status(400).json({ error: "Invalid upload type specified." });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { filename, contentType } = req.body as {
      filename: string;
      contentType: string;
    };

    const config = uploadConfig[type as keyof typeof uploadConfig];

    if (!config.allowedContentTypes.includes(contentType)) {
      return res.status(400).json({ error: "Invalid file type" });
    }

    // Generate unique key (with random suffix)
    const fileKey = `${type}/${(session.user as CustomUser).id}-${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_ASSETS_BUCKET_NAME!,
      Key: fileKey,
      ContentType: contentType,
      Metadata: {
        userId: (session.user as CustomUser).id,
        uploadType: type,
      },
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 }); // valid for 1 min

    return res.status(200).json({
      url: signedUrl,
      key: fileKey,
      bucket: process.env.S3_ASSETS_BUCKET_NAME,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
}