import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasWebhookEvent, markCustomerPaid, recordWebhookEvent } from "@/lib/database";

export const runtime = "nodejs";

type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: {
      customer_email?: string;
      customer?: string | null;
      customer_details?: {
        email?: string | null;
      };
    };
  };
};

function secureCompareHex(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const entries = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = entries.find((entry) => entry.startsWith("t="))?.replace("t=", "");
  const signatures = entries
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.replace("v1=", ""));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampSeconds = Number(timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const toleranceSeconds = 300;
  const age = Math.abs(Date.now() / 1000 - timestampSeconds);

  if (age > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  return signatures.some((candidate) => secureCompareHex(candidate, expected));
}

function readCustomerEmail(event: StripeWebhookEvent): string | null {
  const object = event.data.object;
  return object.customer_details?.email ?? object.customer_email ?? null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret && !signature) {
    return NextResponse.json({ message: "Missing stripe-signature header." }, { status: 400 });
  }

  if (webhookSecret && signature && !verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 400 });
  }

  let event: StripeWebhookEvent;

  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ message: "Webhook body was not valid JSON." }, { status: 400 });
  }

  if (!event.id || !event.type) {
    return NextResponse.json({ message: "Missing required event fields." }, { status: 400 });
  }

  if (await hasWebhookEvent(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await recordWebhookEvent({
    id: event.id,
    provider: "stripe",
    payload: event
  });

  if (event.type === "checkout.session.completed") {
    const email = readCustomerEmail(event);

    if (email) {
      await markCustomerPaid(email, "stripe", event.data.object.customer ?? null);
    }
  }

  return NextResponse.json({ received: true });
}
