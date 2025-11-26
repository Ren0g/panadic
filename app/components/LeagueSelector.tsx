"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type LeagueCode =
  | "PIONIRI"
  | "MLADJI"
  | "PRSTICI"
  | "POC_A"
  | "POC_B"
  | "POC_GOLD"
  | "POC_SILVER";

type League = {
  code: LeagueCode;
  label: string;
};

type Props = {
  leagues: League[];
  selectedLeague: LeagueCode | null;
  onSelect: (code: LeagueCode) => void;
};

export function LeagueSelector({ leagues, selectedLeague, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const current =
    leagues.find((l) => l.code === selectedLeague) ?? leagues[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full bg-[#f7f1e6] px-4 py-2 text-sm font-medium text-[#0b5b2a] shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b5b2a] focus:ring-white"
      >
        <span>{selectedLeague ? current.label : "Odaberi ligu"}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-[#e2d5bd] z-20">
          <ul className="py-1 text-sm text-gray-800">
            {leagues.map((league) => (
              <li key={league.code}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(league.code);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-[#f7f1e6] ${
                    league.code === selectedLeague
                      ? "bg-[#f7f1e6] font-semibold text-[#0b5b2a]"
                      : ""
                  }`}
                >
                  {league.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
