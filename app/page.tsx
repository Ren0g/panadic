"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LeagueView from "@/components/LeagueView";
import { LeagueSelector } from "@/components/LeagueSelector";

type LeagueCode =
  | "PIONIRI"
  | "MLADJI"
  | "PRSTICI"
  | "POC_GOLD"
  | "POC_SILVER";

const LEAGUES: { code: LeagueCode; label: string }[] = [
  { code: "PIONIRI", label: "Pioniri" },
  { code: "MLADJI", label: "Mlađi pioniri" },
  { code: "PRSTICI", label: "Prstići" },
  { code: "POC_GOLD", label: "Zlatna liga" },
  { code: "POC_SILVER", label: "Srebrna liga" },
];

const LEAGUE_LABELS: Record<string, string> = {
  PIONIRI_REG: "Pioniri",
  MLPIONIRI_REG: "Mlađi pioniri",
  PRSTICI_REG: "Prstići",
  POC_GOLD: "Početnici – Zlatna liga",
  POC_SILVER: "Početnici – Srebrna liga",

  PIONIRI_FINAL: "Pioniri",
  MLPIONIRI_FINAL: "Mlađi pioniri",
  PRSTICI_FINAL: "Prstići",
  POC_GOLD_FINAL: "Početnici – Zlatna liga",
  POC_SILVER_FINAL: "Početnici – Srebrna liga",
};

const LIVE_WINDOW_BEFORE_MS = 5 * 60 * 1000;
const LIVE_WINDOW_AFTER_MS = 35 * 60 * 1000;

type CurrentMatch = {
  id: number;
  league_name: string;
  round: number;
  isFinal: boolean;
  match_date: string;
  match_time: string | null;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
  status: "live" | "upcoming";
};

export default function HomePage() {
  const [selectedLeague, setSelectedLeague] =
    useState<LeagueCode | null>(null);
  const [currentMatch, setCurrentMatch] =
    useState<CurrentMatch | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);

  const currentLabel =
    LEAGUES.find((l) => l.code === selectedLeague)?.label ?? "";

  useEffect(() => {
    loadMatch();
  }, []);

  async function loadMatch() {
    setLoadingMatch(true);

    const { data: fixtures, error } = await supabase
      .from("fixtures")
      .select(
        "id, league_code, round, match_date, match_time, home_team_id, away_team_id"
      );

    if (!fixtures || error) {
      setLoadingMatch(false);
      return;
    }

    const now = Date.now();
    const withDT = fixtures.map((f: any) => ({
      ...f,
      dt: new Date(`${f.match_date}T${f.match_time ?? "00:00"}`).getTime(),
    }));

    const live = withDT.filter((f) => {
      const start = f.dt - LIVE_WINDOW_BEFORE_MS;
      const end = f.dt + LIVE_WINDOW_AFTER_MS;
      return now >= start && now <= end;
    });

    let chosen: any = null;
    let status: "live" | "upcoming" = "upcoming";

    if (live.length > 0) {
      live.sort((a, b) => Math.abs(a.dt - now) - Math.abs(b.dt - now));
      chosen = live[0];
      status = "live";
    } else {
      const future = withDT
        .filter((f) => f.dt > now)
        .sort((a, b) => a.dt - b.dt);

      if (future.length > 0) chosen = future[0];
      else {
        setCurrentMatch(null);
        setLoadingMatch(false);
        return;
      }
    }

    const { data: teams } = await supabase
      .from("teams")
      .select("id,name")
      .in("id", [chosen.home_team_id, chosen.away_team_id]);

    const home =
      teams?.find((t) => Number(t.id) === Number(chosen.home_team_id))
        ?.name ?? "Nepoznato";
    const away =
      teams?.find((t) => Number(t.id) === Number(chosen.away_team_id))
        ?.name ?? "Nepoznato";

    const league_name =
      LEAGUE_LABELS[chosen.league_code] ?? chosen.league_code;

    const isFinal = chosen.league_code.includes("_FINAL");

    const { data: res } = await supabase
      .from("results")
      .select("home_goals, away_goals")
      .eq("fixture_id", chosen.id)
      .limit(1);

    setCurrentMatch({
      id: chosen.id,
      league_name,
      round: chosen.round,
      isFinal,
      match_date: chosen.match_date,
      match_time: chosen.match_time,
      home_team: home,
      away_team: away,
      home_goals: res?.[0]?.home_goals ?? null,
      away_goals: res?.[0]?.away_goals ?? null,
      status,
    });

    setLoadingMatch(false);
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-10 space-y-10">

      {/* LIVE BLOCK */}
      <div className="bg-white rounded-xl border border-[#d9cbb1] shadow p-5">
        {loadingMatch ? (
          <div className="text-center text-gray-500 text-sm">
            Učitavanje aktualne utakmice...
          </div>
        ) : !currentMatch ? (
          <div className="text-center text-gray-500 text-sm">
            Trenutno nema utakmica.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-semibold text-[#0A5E2A]">
              <span className="flex items-center gap-2">
                {currentMatch.status === "live" ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
                    U TIJEKU
                  </>
                ) : (
                  "Sljedeća utakmica"
                )}
              </span>

              <span>
                {currentMatch.league_name} —{" "}
                {currentMatch.isFinal
                  ? "Finale"
                  : `${currentMatch.round}. kolo`}
              </span>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-[#0A5E2A]">
                {currentMatch.home_team} — {currentMatch.away_team}
              </div>
              <div className="text-gray-600 text-sm">
                {new Date(currentMatch.match_date).toLocaleDateString("hr-HR")}{" "}
                {currentMatch.match_time &&
                  `u ${currentMatch.match_time.substring(0, 5)}`}
              </div>
            </div>

            <div className="flex justify-center">
              {currentMatch.home_goals !== null &&
              currentMatch.away_goals !== null ? (
                <div className="text-3xl font-extrabold bg-[#f7f1e6] border border-[#d9cbb1] px-6 py-2 rounded-xl text-[#0A5E2A]">
                  {currentMatch.home_goals} : {currentMatch.away_goals}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  Rezultat još nije unesen.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* LEAGUE SELECTOR */}
      <div className="flex justify-center">
        <LeagueSelector
          leagues={LEAGUES}
          selectedLeague={selectedLeague}
          onSelect={setSelectedLeague}
        />
      </div>

      {!selectedLeague && (
        <div className="rounded-xl border border-[#d9cbb1] bg-white px-6 py-8 text-center shadow max-w-xl mx-auto">
          <p className="text-lg font-medium mb-2">Odaberi ligu iz izbornika.</p>
          <p className="text-sm text-gray-600">
            Nakon odabira prikazat će se tablica i utakmice te lige.
          </p>
        </div>
      )}

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
