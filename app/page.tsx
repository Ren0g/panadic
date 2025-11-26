"use client";

import { useState } from "react";
import LeagueView from "@/components/LeagueView";
import { LeagueSelector } from "@/components/LeagueSelector";

type LeagueCode =
  | "PIONIRI"
  | "MLADJI"
  | "PRSTICI"
  | "POC_A"
  | "POC_B"
  | "POC_GOLD"
  | "POC_SILVER";

const LEAGUES: { code: LeagueCode; label: string }[] = [
  { code: "PIONIRI", label: "Pioniri" },
  { code: "MLADJI", label: "Mlađi pioniri" },
  { code: "PRSTICI", label: "Prstići" },
  { code: "POC_A", label: "Početnici A" },
  { code: "POC_B", label: "Početnici B" },
  { code: "POC_GOLD", label: "Zlatna liga" },
  { code: "POC_SILVER", label: "Srebrna liga" },
];

export default function HomePage() {
  const [selectedLeague, setSelectedLeague] = useState<LeagueCode | null>(null);

  const currentLabel =
    LEAGUES.find((l) => l.code === selectedLeague)?.label ?? "";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10">

      {/* DROPDOWN (ovdje pripada) */}
      <div className="flex justify-center mb-6">
        <LeagueSelector
          leagues={LEAGUES}
          selectedLeague={selectedLeague}
          onSelect={setSelectedLeague}
        />
      </div>

      {/* PORUKA */}
      {!selectedLeague && (
        <div className="mt-10 rounded-xl border border-[#d9cbb1] bg-white px-6 py-8 text-center shadow-sm max-w-xl mx-auto">
          <p className="text-lg font-medium mb-2">
            Odaberi ligu iz izbornika.
          </p>
          <p className="text-sm text-gray-600">
            Nakon odabira prikazat će se tablica i sljedeće kolo.
          </p>
        </div>
      )}

      {/* TABLICA + SLIJEDEĆE KOLO */}
      {selectedLeague && (
        <div className="w-full mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-[#0b5b2a] text-center">
            {currentLabel}
          </h2>

          <LeagueView leagueCode={selectedLeague} />
        </div>
      )}
    </div>
  );
}
