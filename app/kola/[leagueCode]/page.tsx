"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LeagueCode =
  | "PIONIRI"
  | "MLADJI"
  | "PRSTICI"
  | "POC_A"
  | "POC_B"
  | "POC_GOLD"
  | "POC_SILVER";

type Fixture = {
  id: string;
  league_code: string;
  round: number;
  match_date: string;
  match_time: string | null;
  home_team_id: string;
  away_team_id: string;
};

const LEAGUE_DB_CODE: Record<LeagueCode, string> = {
  PIONIRI: "PIONIRI_REG",
  MLADJI: "MLPIONIRI_REG",
  PRSTICI: "PRSTICI_REG",
  POC_A: "POC_REG_A",
  POC_B: "POC_REG_B",
  POC_GOLD: "POC_GOLD",
  POC_SILVER: "POC_SILVER",
};

const LEAGUE_NAME: Record<LeagueCode, string> = {
  PIONIRI: "Pioniri",
  MLADJI: "Mlađi pioniri",
  PRSTICI: "Prstići",
  POC_A: "Početnici A",
  POC_B: "Početnici B",
  POC_GOLD: "Početnici – Zlatna liga",
  POC_SILVER: "Početnici – Srebrna liga",
};

export default function AllRoundsPage({
  params,
}: {
  params: { leagueCode: LeagueCode };
}) {
  const { leagueCode } = params;

  const [fixturesByRound, setFixturesByRound] = useState<
    Record<number, any[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const dbCode = LEAGUE_DB_CODE[leagueCode];

      // teams
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name");

      const teamMap: Record<string, string> = {};
      teams?.forEach((t) => {
        // @ts-ignore
        teamMap[t.id] = t.name;
      });

      // fixtures
      const { data: fixtures } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", dbCode)
        .order("round")
        .order("match_date")
        .order("match_time");

      const mapped =
        fixtures?.map((f: Fixture) => {
          let time = "";

          if (f.match_time) {
            const parts = f.match_time.split(":"); // safe
            time = `${parts[0]}:${parts[1]}`;
          }

          return {
            id: f.id,
            round: f.round,
            date: new Date(f.match_date).toLocaleDateString("hr-HR"),
            time,
            home: teamMap[f.home_team_id] ?? "Nepoznato",
            away: teamMap[f.away_team_id] ?? "Nepoznato",
          };
        }) ?? [];

      // group
      const grouped: Record<number, any[]> = {};
      mapped.forEach((m) => {
        if (!grouped[m.round]) grouped[m.round] = [];
        grouped[m.round].push(m);
      });

      setFixturesByRound(grouped);
      setLoading(false);
    };

    load();
  }, [leagueCode]);

  if (loading) return <p className="text-black">Učitavanje...</p>;

  const leagueName = LEAGUE_NAME[leagueCode];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#0A5E2A] text-center mb-6">
        Sva kola — {leagueName}
      </h1>

      {Object.keys(fixturesByRound)
        .sort((a, b) => Number(a) - Number(b))
        .map((roundKey) => {
          const round = Number(roundKey);
          const matches = fixturesByRound[round];

          return (
            <div
              key={round}
              className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow space-y-3"
            >
              <h2 className="text-xl font-semibold">{round}. kolo</h2>

              <ul className="space-y-2 text-sm">
                {matches.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#0d6b35] px-3 py-2 rounded-lg"
                  >
                    <span className="font-medium">
                      {m.home} — {m.away}
                    </span>
                    <span className="sm:text-right text-[#fcefd5]">
                      {m.date} {m.time && `u ${m.time}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </div>
  );
}
