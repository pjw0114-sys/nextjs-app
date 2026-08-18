import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

export const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30일

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(
  profileId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  await pool.query(
    "INSERT INTO sessions (id, profile_id, expires_at) VALUES (?, ?, ?)",
    [tokenHash, profileId, expiresAt],
  );
  return { token, expiresAt };
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const rows = await pool.query(
    `SELECT p.id, p.email, p.name, p.avatar_url
     FROM sessions s
     JOIN profiles p ON p.id = s.profile_id
     WHERE s.id = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id.toString(),
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url ?? null,
  };
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return;
  await pool.query("DELETE FROM sessions WHERE id = ?", [
    hashSessionToken(token),
  ]);
}
