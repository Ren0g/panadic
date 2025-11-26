"use client";

import { useState } from "react";
import Image from "next/image";
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

  const currentLeagueLabel =
    LEAGUES.find((l) => l.code === selectedLeague)?.label ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f1e6] text-black">
      {/* HEADER */}
      <header className="w-full bg-[#0b5b2a] text-[#f7f1e6]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Liga Panadić logo"
              width={32}
              height={32}
            />
            <span className="text-lg sm:text-xl font-semibold">
              Liga Panadić 2025/26
            </span>
          </div>

          <LeagueSelector
            leagues={LEAGUES}
            selectedLeague={selectedLeague}
            onSelect={setSelectedLeague}
          />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center">
          {!selectedLeague && (
            <div className="mt-16 rounded-xl border border-[#d9cbb1] bg-white px-6 py-8 text-center shadow-sm max-w-xl">
              <p className="text-lg font-medium mb-2">
                Odaberi ligu iz izbornika gore desno.
              </p>
              <p className="text-sm text-gray-600">
                Nakon odabira prikazat će se tablica i sljedeće kolo za
                odabranu ligu.
              </p>
            </div>
          )}

          {selectedLeague && (
            <div className="w-full mt-6">
              {/* Ako želiš dodatni naslov iznad tablice, ostavi ovo,
                  inače slobodno izbriši ovaj blok */}
              {currentLeagueLabel && (
                <h2 className="text-xl font-semibold mb-4 text-[#0b5b2a] text-center">
                  {currentLeagueLabel}
                </h2>
              )}

              {/* Ovdje koristimo postojeći LeagueView koji već radi tablicu
                 i karticu ispod (koju kasnije možemo prilagoditi da postane
                 “Sljedeće kolo”). */}
              <LeagueView leagueCode={selectedLeague} />
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#0b5b2a] text-[#f7f1e6]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Promar logo"
              width={28}
              height={28}
            />
          </div>
          <a
            href="https://promar.hr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
          >
            © 2025 Promar.hr
          </a>
        </div>
      </footer>
    </div>
  );
}
