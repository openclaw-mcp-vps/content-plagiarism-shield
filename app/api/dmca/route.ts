import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createDmcaNotice,
  getScanResultForOwner,
  resolveScanResult
} from "@/lib/database";
import { generateDmcaNotice, guessAbuseMailbox } from "@/lib/dmca-generator";
import { sendDmcaNoticeEmail } from "@/lib/email";
import { getPaidEmailFromRequest } from "@/lib/paywall";

export const runtime = "nodejs";

const dmcaSchema = z.object({
  scanResultId: z.string().uuid("Invalid scan result id."),
  complainantName: z.string().min(2, "Complainant name is required."),
  complainantEmail: z.string().email("Provide a valid complainant email."),
  companyName: z.string().optional(),
  sendEmail: z.boolean().optional().default(true)
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

  const parsed = dmcaSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 }
    );
  }

  const result = await getScanResultForOwner(email, parsed.data.scanResultId);

  if (!result) {
    return NextResponse.json({ message: "Scan result not found." }, { status: 404 });
  }

  const noticeText = generateDmcaNotice({
    complainantName: parsed.data.complainantName,
    complainantEmail: parsed.data.complainantEmail,
    sourceUrl: result.sourceUrl,
    sourceTitle: result.contentTitle,
    infringingUrl: result.infringingUrl,
    companyName: parsed.data.companyName
  });

  const recipient = guessAbuseMailbox(result.infringingUrl);
  let status: "draft" | "sent" | "failed" = "draft";

  if (parsed.data.sendEmail) {
    const mailResult = await sendDmcaNoticeEmail({
      to: recipient,
      complainantEmail: parsed.data.complainantEmail,
      noticeText
    });

    status = mailResult.sent ? "sent" : "failed";
  }

  if (status === "sent") {
    await resolveScanResult(result.id);
  }

  const notice = await createDmcaNotice({
    scanResultId: result.id,
    complainantName: parsed.data.complainantName,
    complainantEmail: parsed.data.complainantEmail,
    status,
    noticeText,
    sentTo: parsed.data.sendEmail ? recipient : null
  });

  return NextResponse.json({
    notice,
    message:
      status === "sent"
        ? "DMCA notice sent and result marked resolved."
        : "DMCA notice generated. Configure SMTP to send emails directly."
  });
}
