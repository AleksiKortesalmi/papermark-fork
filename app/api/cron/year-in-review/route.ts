import { NextResponse } from "next/server";

import { verifyPayload } from "@/lib/cron";
import { log } from "@/lib/utils";
import { processEmailQueue } from "@/lib/year-in-review/send-emails";

// Runs every hour (0 * * * *)
export const maxDuration = 300; // 5 minutes in seconds

export async function POST(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const isValid = verifyPayload(
      JSON.stringify(body),
      req.headers.get("Upstash-Signature") || "",
    );
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    await processEmailQueue();
    return NextResponse.json({ success: true });
  } catch (error) {
    await log({
      message: `Year in review email cron failed. \n\nError: ${(error as Error).message}`,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: (error as Error).message });
  }
}
