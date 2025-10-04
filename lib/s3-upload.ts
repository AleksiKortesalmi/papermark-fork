// utils/s3-upload.ts
export async function upload(
  filename: string,
  file: File | Blob,
  options: {
    access?: "public" | "private"; // optional, for future use
    handleUploadUrl: string;       // your API endpoint, e.g. /api/file/image-upload?type=profile
  }
): Promise<{ url: string; key: string; bucket: string }> {
  // Step 1: ask your API for a pre-signed PUT URL
  const res = await fetch(options.handleUploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      contentType: (file as File).type ?? "application/octet-stream",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get signed URL: ${await res.text()}`);
  }

  const { url, key, bucket } = await res.json();

  // Step 2: PUT file directly to S3/MinIO
  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": (file as File).type ?? "application/octet-stream",
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`Upload failed: ${await putRes.text()}`);
  }

  // Step 3: return object info (url = public URL if bucket allows anonymous download)
  return {
    url: `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${bucket}/${key}`,
    key,
    bucket,
  };
}
