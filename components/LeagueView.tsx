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

type Standing = {
  league_code: string;
  team_id: string;
  ut: number;
  p: number;
  n: number;
  i: number;
  gplus: number;
  gminus: number;
  gr: number;
  bodovi: number;
};

type Fixture = {
  id: string;
  league_code: string;
  round: number;
  match_date: string;
  match_time_start: string | null;
  match_time_end: string | null;
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

type NextRoundMatch = {
  id: string;
  round: number;
  date: string;
  time: string;
  home_team_name: string;
  away_team_name: string;
};

export default function LeagueView({ leagueCode }: { leagueCode: LeagueCode }) {
  const [standings, setStandings] = useState<(Standing & { team_name: string })[]>([]);
  const [nextRoundMatches, setNextRoundMatches] = useState<NextRoundMatch[]>([]);
  const [nextRoundNumber, setNextRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const dbLeagueCode = LEAGUE_DB_CODE[leagueCode];

      // --- UČITAJ TIMOVE ---
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name");

      const teamMap: Record<string, string> = {};
      teams?.forEach((t) => (teamMap[t.id] = t.name));

      // --- UČITAJ TABLICU ---
      const { data: rawStandings } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", dbLeagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      const finalStandings =
        rawStandings?.map((s: Standing) => ({
          ...s,
          team_name: teamMap[s.team_id] ?? "Nepoznato",
        })) ?? [];

      setStandings(finalStandings);

      // --- UČITAJ SVE UTAKMICE ---
      const { data: rawFixtures } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", dbLeagueCode);

      const now = new Date();

      const fixtures = rawFixtures?.map((f: Fixture) => {
        const dateObj = new Date(f.match_date);

        const fullDateTime = new Date(
          `${f.match_date}T${f.match_time_start || "00:00"}`
        );

        let timeFormatted = "";
        if (f.match_time_start && f.match_time_end)
          timeFormatted = `${f.match_time_start} - ${f.match_time_end}`;
        else if (f.match_time_start)
          timeFormatted = f.match_time_start;
        else if (f.match_time_end)
          timeFormatted = f.match_time_end;

        return {
          ...f,
          fullDateTime,
          dateFormatted: dateObj.toLocaleDateString("hr-HR"),
          timeFormatted,
          home_team_name: teamMap[f.home_team_id] ?? "Nepoznato",
          away_team_name: teamMap[f.away_team_id] ?? "Nepoznato",
        };
      }) ?? [];

      // --- NAĐI SLJEDEĆE KOLO ---
      const futureFixtures = fixtures.filter((f) => f.fullDateTime > now);

      if (futureFixtures.length === 0) {
        setNextRoundMatches([]);
        setNextRoundNumber(null);
        setLoading(false);
        return;
      }

      const nextRound = Math.min(...futureFixtures.map((f) => f.round));

      const nextRoundList = futureFixtures
        .filter((f) => f.round === nextRound)
        .sort((a, b) => a.fullDateTime.getTime() - b.fullDateTime.getTime())
        .map((f) => ({
          id: f.id,
          round: f.round,
          date: f.dateFormatted,
          time: f.timeFormatted,
          home_team_name: f.home_team_name,
          away_team_name: f.away_team_name,
        }));

      setNextRoundNumber(nextRound);
      setNextRoundMatches(nextRoundList);

      setLoading(false);
    };

    loadData();
  }, [leagueCode]);

  if (loading) return <p className="text-black">Učitavanje...</p>;

  const leagueName = LEAGUE_NAME[leagueCode];

  return (
    <div className="space-y-6">
      {/* ---------------- TABLICA ---------------- */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a] text-[#1a1a1a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {leagueName}
        </h1>

        <table className="w-full text-sm">
          <thead className="border-b border-[#c8b59a] text-[#0A5E2A]">
            <tr>
              <th className="py-2 w-6 text-left">#</th>
              <th className="py-2 text-left">Klub</th>
              <th className="py-2 w-10 text-center">UT</th>
              <th className="py-2 w-10 text-center">P</th>
              <th className="py-2 w-10 text-center">N</th>
              <th className="py-2 w-10 text-center">I</th>
              <th className="py-2 w-10 text-center">G+</th>
              <th className="py-2 w-10 text-center">G-</th>
              <th className="py-2 w-12 text-center">GR</th>
              <th className="py-2 w-12 text-center">Bod</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team_id} className="border-b border-[#e3d4bf] bg-white">
                <td className="py-2 px-1">{i + 1}</td>
                <td className="py-2">{s.team_name}</td>
                <td className="py-2 text-center">{s.ut}</td>
                <td className="py-2 text-center">{s.p}</td>
                <td className="py-2 text-center">{s.n}</td>
                <td className="py-2 text-center">{s.i}</td>
                <td className="py-2 text-center">{s.gplus}</td>
                <td className="py-2 text-center">{s.gminus}</td>
                <td className="py-2 text-center">{s.gr}</td>
                <td className="py-2 text-center font-bold text-[#0A5E2A]">
                  {s.bodovi}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- SLJEDEĆE KOLO ---------------- */}
      <div className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow w-full max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-3">
          {nextRoundNumber
            ? `Sljedeće kolo — ${nextRoundNumber}. kolo`
            : "Sljedeće kolo"}
        </h2>

        {nextRoundMatches.length === 0 ? (
          <p className="text-sm">Nema nadolazećih kola.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {nextRoundMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#0A5E2A]"
              >
                <span className="font-medium">
                  {m.home_team_name} — {m.away_team_name}
                </span>

                <span className="text-[#fcefd5] sm:ml-4 sm:whitespace-nowrap">
                  {m.date} {m.time && `u ${m.time}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* LINK ISPOD LISTE */}
        <div className="mt-4">
          <a
            href={`/kola/${leagueCode}`}
            className="text-sm underline hover:no-underline"
          >
            Pogledaj sva kola →
          </a>
        </div>
      </div>
    </div>
  );
}
