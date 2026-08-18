import { pool } from "@/lib/db";

export async function GET() {
  try {
    const rows = await pool.query("SELECT 1 AS ok, VERSION() AS version");
    return Response.json({
      ok: true,
      version: rows[0].version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, message }, { status: 503 });
  }
}
