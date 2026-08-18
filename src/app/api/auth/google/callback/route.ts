import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE_NAME,
  exchangeCodeForToken,
  fetchGoogleUserInfo,
} from "@/lib/google-oauth";
import { findOrCreateProfileFromGoogle } from "@/lib/profiles";
import {
  SESSION_COOKIE_NAME,
  createSession,
  sessionCookieOptions,
} from "@/lib/session";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function redirectWithError(request: Request, code: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    // 사용자가 Google 동의 화면에서 취소/거부한 경우 (error=access_denied 등)
    return redirectWithError(request, errorParam);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !savedState || !safeEqual(state, savedState)) {
    return redirectWithError(request, "invalid_state");
  }

  let profileId: string;
  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const googleUser = await fetchGoogleUserInfo(tokenResponse.access_token);
    const result = await findOrCreateProfileFromGoogle(googleUser);

    if (result.status === "email_not_verified") {
      return redirectWithError(request, "email_not_verified");
    }
    if (result.status === "conflict") {
      return redirectWithError(request, "account_conflict");
    }
    profileId = result.profileId;
  } catch (error) {
    console.error("[auth/google/callback] Google 인증 처리 중 오류:", error);
    return redirectWithError(request, "server_error");
  }

  try {
    const { token, expiresAt } = await createSession(profileId);
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      ),
    );
    return response;
  } catch (error) {
    console.error("[auth/google/callback] 세션 생성 중 오류:", error);
    return redirectWithError(request, "server_error");
  }
}
