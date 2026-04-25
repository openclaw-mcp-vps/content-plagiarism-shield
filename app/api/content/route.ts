import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addMonitoredContent,
  listMonitoredContent,
  listScanResultsByOwner
} from "@/lib/database";
import { getPaidEmailFromRequest } from "@/lib/paywall";
import { inspectSourceContent } from "@/lib/plagiarism-scanner";

export const runtime = "nodejs";

const createContentSchema = z.object({
  sourceUrl: z.string().url("Provide a valid URL to monitor."),
  title: z.string().trim().max(140).optional().default("")
});

function unauthorizedResponse() {
  return NextResponse.json(
    { message: "Paid access is required. Unlock your dashboard first." },
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  const email = getPaidEmailFromRequest(request);

  if (!email) {
    return unauthorizedResponse();
  }

  const [content, results] = await Promise.all([
    listMonitoredContent(email),
    listScanResultsByOwner(email)
  ]);

  return NextResponse.json({ content, results });
}

export async function POST(request: NextRequest) {
  const email = getPaidEmailFromRequest(request);

  if (!email) {
    return unauthorizedResponse();
  }

  const parsed = createContentSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 }
    );
  }

  const scraped = await inspectSourceContent(parsed.data.sourceUrl);

  const content = await addMonitoredContent({
    ownerEmail: email,
    sourceUrl: parsed.data.sourceUrl,
    title: parsed.data.title || scraped.title,
    excerpt: scraped.excerpt,
    contentFingerprint: scraped.contentFingerprint
  });

  return NextResponse.json({ content });
}
