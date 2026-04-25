import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/paywall";
import { isCustomerPaid } from "@/lib/database";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email("Enter a valid purchase email.")
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 }
    );
  }

  const paid = await isCustomerPaid(parsed.data.email);

  if (!paid) {
    return NextResponse.json(
      {
        message:
          "No completed Stripe purchase found for that email yet. Finish checkout first, then try again."
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ message: "Purchase confirmed." });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(parsed.data.email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 31,
    path: "/"
  });

  return response;
}
