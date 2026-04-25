import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ACCESS_COOKIE_NAME = "content_shield_access";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type AccessPayload = {
  email: string;
  exp: number;
};

function getSecret(): string {
  return process.env.PAYWALL_COOKIE_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "development-secret";
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export function createAccessToken(email: string): string {
  const payload: AccessPayload = {
    email: email.trim().toLowerCase(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 31
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function readEmailFromAccessToken(token: string | undefined): string | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);

  try {
    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessPayload;

    if (!payload.email || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload.email;
  } catch {
    return null;
  }
}

export function getPaidEmailFromCookieReader(reader: CookieReader): string | null {
  const token = reader.get(ACCESS_COOKIE_NAME)?.value;
  return readEmailFromAccessToken(token);
}

export function getPaidEmailFromRequest(request: NextRequest): string | null {
  return getPaidEmailFromCookieReader(request.cookies);
}
