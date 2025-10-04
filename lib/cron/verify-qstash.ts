import { verifyPayload } from "./index";
import { log } from "../utils";

export const verifyQstashSignature = async ({
  req,
  rawBody,
}: {
  req: Request;
  rawBody: string; // Make sure to pass the raw body not parsed JSON
}) => {
  // skip verification in local development
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const signature = req.headers.get("Upstash-Signature");

  if (!signature) {
    throw new Error("Signature header not found.");
  }

  const isValid = verifyPayload(rawBody, signature);

  if (!isValid) {
    const url = req.url;
    const messageId = req.headers.get("Upstash-Message-Id");

    log({
      message: `Invalid QStash request signature: *${url}* - *${messageId}*`,
      type: "error",
      mention: true,
    });

    throw new Error("Invalid QStash request signature.");
  }
};