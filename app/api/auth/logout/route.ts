import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME } from "@/lib/paywall";

export const runtime = "nodejs";

function clearCookieAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/"
  });
  return response;
}

export function GET(request: NextRequest) {
  return clearCookieAndRedirect(request);
}

export function POST(request: NextRequest) {
  return clearCookieAndRedirect(request);
}
