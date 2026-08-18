import { pool } from "@/lib/db";
import type { GoogleUserInfo } from "@/lib/google-oauth";

export type LinkResult =
  | { status: "ok"; profileId: string }
  | { status: "email_not_verified" }
  | { status: "conflict" };

export async function findOrCreateProfileFromGoogle(
  google: GoogleUserInfo,
): Promise<LinkResult> {
  const email = google.email.trim().toLowerCase();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) google_id로 우선 조회 (이미 연동된 사용자의 재로그인)
    const byGoogleId = await conn.query(
      "SELECT id FROM profiles WHERE google_id = ? LIMIT 1",
      [google.sub],
    );
    if (byGoogleId.length > 0) {
      await conn.commit();
      return { status: "ok", profileId: byGoogleId[0].id.toString() };
    }

    // 2) 이메일로 기존 이메일/비밀번호 가입자 조회 → 검증된 이메일이면 자동 연동
    const byEmail = await conn.query(
      "SELECT id FROM profiles WHERE email = ? LIMIT 1",
      [email],
    );

    if (byEmail.length > 0) {
      if (!google.email_verified) {
        await conn.rollback();
        return { status: "email_not_verified" };
      }

      const existing = byEmail[0];
      const updateResult = await conn.query(
        `UPDATE profiles
         SET google_id = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND google_id IS NULL`,
        [google.sub, google.picture ?? null, existing.id],
      );
      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        return { status: "conflict" };
      }
      await conn.commit();
      return { status: "ok", profileId: existing.id.toString() };
    }

    // 3) 신규 가입 (구글 전용, password_hash 없음)
    if (!google.email_verified) {
      await conn.rollback();
      return { status: "email_not_verified" };
    }

    const insertResult = await conn.query(
      `INSERT INTO profiles (email, name, google_id, avatar_url, password_hash)
       VALUES (?, ?, ?, ?, NULL)`,
      [email, google.name, google.sub, google.picture ?? null],
    );
    await conn.commit();
    return { status: "ok", profileId: insertResult.insertId.toString() };
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      // 동시 요청으로 UNIQUE 제약(email 또는 google_id)에 걸린 경우
      return { status: "conflict" };
    }
    throw error;
  } finally {
    conn.release();
  }
}
