"use client";

import { useState } from "react";

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

export function LeagueSelector({
  leagues,
  selectedLeague,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  const current =
    leagues.find((l) => l.code === selectedLeague) ?? null;

  return (
    <div className="relative">
      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-full bg-[#f7f1e6] px-4 py-2 text-sm font-medium text-[#0b5b2a] shadow hover:bg-white transition"
      >
        {current ? current.label : "Odaberi ligu"}
        <span className="text-xs">▼</span>
      </button>

      {/* DROPDOWN LIST */}
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
