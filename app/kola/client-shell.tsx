"use client";

import { useSearchParams } from "next/navigation";
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

export default function ClientShell() {
  const params = useSearchParams();
  const raw = params.get("league");
  const league =
    typeof raw === "string" ? raw.trim().toUpperCase() : null;

  if (!league || !leagueMap[league]) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-red-600">
          Liga nije pronađena.
        </h1>
        <p className="text-gray-600 mt-2">
          Provjerite URL ili odaberite ligu iz početnog izbornika.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Učitavanje kola…</div>}>
      <ClientKola leagueCode={leagueMap[league]} />
    </Suspense>
  );
}
