import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, deleteCurrentSession } from "@/lib/session";

export async function POST(request: Request) {
  await deleteCurrentSession();
  // 303 필수: 기본 307은 메서드를 보존해 "/"로 POST가 재전송되며 405가 날 수 있음
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
