import { Queue, Worker } from "bullmq";
import { redis } from "../redis"
import Bottleneck from "bottleneck";
import crypto from "crypto";

// -----------------------------
// Bottleneck rate limiter (same behavior)
// -----------------------------
export const limiter = new Bottleneck({
  maxConcurrent: 1, // maximum concurrent requests
  minTime: 100, // minimum time between requests in ms
});

// -----------------------------
// Self-hosted signing
// -----------------------------
const SIGNING_KEY = process.env.QSTASH_SIGNING_KEY || "supersecret";

// sign payload
export function signPayload(payload: string) {
  return crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest("hex");
}

// verify payload
export function verifyPayload(payload: string, signature: string) {
  const expected = signPayload(payload);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// -----------------------------
// BullMQ Queue for jobs
// -----------------------------
export const qstashQueue = new Queue("jobs", {
  connection: redis as any,
});

// Worker to process jobs
export const worker = new Worker(
  "jobs",
  async (job) => {
    await limiter.schedule(async () => {
      console.log("[LocalQStash] Processing job:", job.data);
      // Replace with actual job logic (HTTP requests, emails, etc.)
    });
  },
  {
    connection: redis as any,
  }
);

// -----------------------------
// Replacement for qstash
// -----------------------------
export const qstash = {
  send: async ({
    url,
    body,
    headers = {},
    method = "POST",
  }: {
    url: string;
    body: any;
    headers?: Record<string, string>;
    method?: string;
  }) => {
    const payload = { url, body, headers, method, createdAt: Date.now() };
    const signature = signPayload(JSON.stringify(payload));

    // Add signature and message ID to the payload
    await qstashQueue.add("job", { ...payload, signature, messageId: crypto.randomUUID() });
    console.log("[LocalQStash] Job queued:", payload);
  },
  /**
   * Local replacement for QStash.publishJSON
   * Usage:
   *   await qstash.publishJSON({ url: "/api/send-email", body: { to: "test@example.com" } })
   */
  publishJSON: async ({
    url,
    body,
    headers = {},
    method = "POST",
    callback,
    failureCallback,
  }: {
    url: string;
    body: Record<string, any>;
    headers?: Record<string, string>;
    method?: string;
    callback?: string;          // success callback
    failureCallback?: string;   // failure callback
  }) => {
    const fullHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    const payload = {
      url,
      body,
      headers: fullHeaders,
      method,
      callback,
      failureCallback,
      createdAt: Date.now(),
    };

    const signature = signPayload(JSON.stringify(payload));
    const messageId = crypto.randomUUID();

    await qstashQueue.add("job", {
      ...payload,
      signature,
      messageId,
    });

    console.log("[LocalQStash] JSON job queued:", payload);

    return {
      messageId,
      url,
      callback,
      failureCallback,
      queuedAt: new Date().toISOString(),
    };
  },
};
