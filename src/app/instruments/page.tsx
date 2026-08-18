import { pool } from "@/lib/db";
import { Suspense } from "react";

// 요청마다 DB를 조회해야 하므로 정적 프리렌더링 대상에서 제외한다.
export const dynamic = "force-dynamic";

type Instrument = {
  id: number | bigint;
  name: string;
};

async function InstrumentsData() {
  const instruments = await pool.query<Instrument[]>(
    "SELECT id, name FROM instruments",
  );

  return (
    <pre>
      {JSON.stringify(
        instruments,
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      )}
    </pre>
  );
}

export default function Instruments() {
  return (
    <Suspense fallback={<div>Loading instruments...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}
