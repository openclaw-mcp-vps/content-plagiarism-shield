import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getContentById,
  listMonitoredContent,
  listScanResultsByOwner,
  updateContentLastScan,
  upsertScanResults
} from "@/lib/database";
import { getPaidEmailFromRequest } from "@/lib/paywall";
import { scanForPlagiarism } from "@/lib/plagiarism-scanner";
import { sendPlagiarismAlert } from "@/lib/email";

export const runtime = "nodejs";

const scanSchema = z.object({
  contentId: z.string().uuid().optional()
});

function unauthorizedResponse() {
  return NextResponse.json(
    { message: "Paid access is required. Unlock your dashboard first." },
    { status: 401 }
  );
}

export async function POST(request: NextRequest) {
  const email = getPaidEmailFromRequest(request);

  if (!email) {
    return unauthorizedResponse();
  }

  const parsed = scanSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 }
    );
  }

  let targets = await listMonitoredContent(email);

  if (parsed.data.contentId) {
    const requested = await getContentById(parsed.data.contentId);

    if (!requested || requested.ownerEmail !== email) {
      return NextResponse.json({ message: "Content record not found." }, { status: 404 });
    }

    targets = [requested];
  }

  if (targets.length === 0) {
    return NextResponse.json({
      message: "No monitored URLs found yet.",
      results: []
    });
  }

  const dashboardUrl = `${request.nextUrl.origin}/dashboard`;

  for (const content of targets) {
    const matches = await scanForPlagiarism(content.sourceUrl, content.title);
    await upsertScanResults(content.id, matches);
    await updateContentLastScan(content.id, new Date().toISOString());

    if (matches.length > 0) {
      await sendPlagiarismAlert({
        to: email,
        contentTitle: content.title,
        dashboardUrl,
        findings: matches.map((match) => ({
          infringingUrl: match.infringingUrl,
          confidence: match.confidence
        }))
      });
    }
  }

  const results = await listScanResultsByOwner(email);

  return NextResponse.json({
    message: "Scan completed.",
    results
  });
}
