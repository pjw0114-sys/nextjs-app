import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  createSession,
  sessionCookieOptions,
} from "@/lib/session";

function redirectToLoginWithError(request: Request, code: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  // 303 필수: 기본 307은 메서드를 보존해 "/login"에 POST가 재전송되며 405가 날 수 있음
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return redirectToLoginWithError(request, "invalid_credentials");
  }

  try {
    const rows = await pool.query(
      "SELECT id, password_hash FROM profiles WHERE email = ? LIMIT 1",
      [email],
    );

    // 계정이 없거나(Google 전용 가입이라 password_hash가 없는 경우 포함) 비밀번호가
    // 틀린 경우를 구분하지 않고 동일한 메시지로 응답한다 (계정 존재 여부 추측 방지).
    if (rows.length === 0 || !rows[0].password_hash) {
      return redirectToLoginWithError(request, "invalid_credentials");
    }

    const isValid = await verifyPassword(password, rows[0].password_hash);
    if (!isValid) {
      return redirectToLoginWithError(request, "invalid_credentials");
    }

    const profileId = rows[0].id.toString();
    const { token, expiresAt } = await createSession(profileId);

    const response = NextResponse.redirect(new URL("/", request.url), 303);
    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(
        Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      ),
    );
    return response;
  } catch (error) {
    console.error("[auth/login] 로그인 처리 중 오류:", error);
    return redirectToLoginWithError(request, "server_error");
  }
}
