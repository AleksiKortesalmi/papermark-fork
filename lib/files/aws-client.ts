import { LambdaClient, LambdaClientConfig } from "@aws-sdk/client-lambda";
import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

export const getStorageConfig = (): S3ClientConfig => {
  return {
    endpoint: process.env.S3_ENDPOINT!,
    region: process.env.S3_REGION!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  };
};

export const getLambdaConfig = (): LambdaClientConfig => {
  return {
    endpoint: process.env.S3_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  };
};

export const getS3Client = (storageRegion?: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  return new S3Client(getStorageConfig());
};

export const getS3ClientForTeam = async (teamId: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  return new S3Client(getStorageConfig());
};

export const getLambdaClient = (storageRegion?: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  return new LambdaClient(getLambdaConfig());
};

export const getLambdaClientForTeam = async (teamId: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  return new LambdaClient(getLambdaConfig());
};

/**
 * Gets both S3 client and storage config for a team in a single call.
 * This is more efficient than calling getS3ClientForTeam and getTeamStorageConfigById separately.
 *
 * @param teamId - The team ID
 * @returns Promise<{ client: S3Client, config: StorageConfig }> - Both client and config
 */
export const getTeamS3ClientAndConfig = async (teamId: string) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  if (NEXT_PUBLIC_UPLOAD_TRANSPORT !== "s3") {
    throw new Error("Invalid upload transport");
  }

  const config = getStorageConfig();

  const client = new S3Client(config);
  
  const bucket = process.env.S3_BUCKET_NAME!;

  return { client, config, bucket };
};
