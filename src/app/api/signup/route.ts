import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupBody = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "요청 본문이 올바른 JSON 형식이 아닙니다." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim();

  if (!email || !EMAIL_PATTERN.test(email)) {
    return Response.json(
      { ok: false, message: "올바른 이메일 주소를 입력해 주세요." },
      { status: 400 },
    );
  }
  if (!password || password.length < 8) {
    return Response.json(
      { ok: false, message: "비밀번호는 8자 이상이어야 합니다." },
      { status: 400 },
    );
  }
  if (!name) {
    return Response.json(
      { ok: false, message: "이름을 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      "INSERT INTO profiles (email, password_hash, name) VALUES (?, ?, ?)",
      [email, passwordHash, name],
    );

    return Response.json(
      {
        ok: true,
        profile: { id: result.insertId.toString(), email, name },
      },
      { status: 201 },
    );
  } catch (error) {
    // MariaDB 중복 키 에러(이메일 UNIQUE 제약 위반)는 409로 별도 처리
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return Response.json(
        { ok: false, message: "이미 가입된 이메일입니다." },
        { status: 409 },
      );
    }

    // 원인은 서버 로그로만 남기고, 클라이언트에는 내부 정보를 노출하지 않는다
    console.error("[signup] 회원가입 처리 중 오류:", error);
    return Response.json(
      {
        ok: false,
        message:
          "서버 오류로 회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }
}
