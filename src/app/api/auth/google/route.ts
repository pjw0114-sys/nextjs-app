import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  OAUTH_STATE_COOKIE_NAME,
  buildGoogleAuthorizationUrl,
} from "@/lib/google-oauth";

export async function GET() {
  const state = randomBytes(32).toString("base64url");
  const authUrl = buildGoogleAuthorizationUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
