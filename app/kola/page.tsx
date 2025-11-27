// app/kola/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ClientKola from "./client";

const leagueMap: Record<string, string> = {
  PIONIRI: "PIONIRI_REG",
  MLADJI: "MLPIONIRI_REG",
  PRSTICI: "PRSTICI_REG",
  POC_A: "POC_REG_A",
  POC_B: "POC_REG_B",
  POC_GOLD: "POC_GOLD",
  POC_SILVER: "POC_SILVER",
};

export default function Page({ searchParams }: { searchParams: any }) {
  const raw = searchParams.league;
  const league =
    typeof raw === "string" ? raw.trim().toUpperCase() : null;

  // 🔥 DEBUG PRIKAZ NA EKRANU
  return (
    <div className="p-4">
      <div className="mb-4 p-3 border border-red-500 bg-red-100 text-red-900 rounded">
        <div><strong>RAW:</strong> {String(raw)}</div>
        <div><strong>NORMALIZED:</strong> {String(league)}</div>
        <div><strong>VALID KEYS:</strong> {Object.keys(leagueMap).join(", ")}</div>
      </div>

      {!league || !leagueMap[league] ? (
        <div className="p-6 text-center">
          <h1 className="text-xl font-bold text-red-600">
            Liga nije pronađena.
          </h1>
        </div>
      ) : (
        <Suspense fallback={<div>Učitavanje kola…</div>}>
          <ClientKola leagueCode={leagueMap[league]} />
        </Suspense>
      )}
    </div>
  );
}
