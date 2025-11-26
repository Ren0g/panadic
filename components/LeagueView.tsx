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
  match_date: string; // Supabase vraća kao string (YYYY-MM-DD)
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
  date: string; // formatiran datum
  time: string; // "08:30 - 09:00" ili sl.
  home_team_name: string;
  away_team_name: string;
};

export default function LeagueView({
  leagueCode,
}: {
  leagueCode: LeagueCode;
}) {
  const [standings, setStandings] = useState<
    (Standing & { team_name: string })[]
  >([]);
  const [nextRoundMatches, setNextRoundMatches] = useState<NextRoundMatch[]>(
    []
  );
  const [nextRoundNumber, setNextRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const dbLeagueCode = LEAGUE_DB_CODE[leagueCode];

      // 1) Učitaj sve timove
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name");

      if (teamsError) {
        console.error("Greška kod čitanja teams:", teamsError);
      }

      const teamMap: Record<string, string> = {};
      teams?.forEach((t) => {
        // @ts-ignore
        teamMap[t.id] = t.name;
      });

      // 2) Učitaj standings za ovu ligu
      const { data: rawStandings, error: standingsError } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", dbLeagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      if (standingsError) {
        console.error("Greška kod čitanja standings:", standingsError);
      }

      const finalStandings =
        (rawStandings as Standing[] | null)?.map((s) => ({
          ...s,
          team_name: teamMap[s.team_id] ?? "Nepoznato",
        })) ?? [];

      setStandings(finalStandings);

      // 3) Učitaj sve fixtures za ovu ligu
      const { data: rawFixtures, error: fixturesError } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", dbLeagueCode);

      if (fixturesError) {
        console.error("Greška kod čitanja fixtures:", fixturesError);
      }

      const now = new Date();

      const fixtures = (rawFixtures as Fixture[] | null)?.map((f) => {
        const dateObj = new Date(f.match_date);
        const fullDateTime = new Date(
          `${f.match_date}T${f.match_time_start || "00:00"}`
        );

        let timeString = "";
        if (f.match_time_start && f.match_time_end) {
          timeString = `${f.match_time_start} - ${f.match_time_end}`;
        } else if (f.match_time_start) {
          timeString = f.match_time_start;
        } else if (f.match_time_end) {
          timeString = f.match_time_end;
        }

        return {
          ...f,
          fullDateTime,
          dateFormatted: dateObj.toLocaleDateString("hr-HR"),
          timeFormatted: timeString,
          home_team_name: teamMap[f.home_team_id] ?? "Nepoznato",
          away_team_name: teamMap[f.away_team_id] ?? "Nepoznato",
        };
      }) ?? [];

      // 4) Odredi "sljedeće kolo" prema datumu/vremenu
      const futureFixtures = fixtures.filter(
        (f) => f.fullDateTime > now
      );

      if (futureFixtures.length === 0) {
        setNextRoundMatches([]);
        setNextRoundNumber(null);
        setLoading(false);
        return;
      }

      const nextRound = futureFixtures.reduce(
        (min, f) => (f.round < min ? f.round : min),
        futureFixtures[0].round
      );

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

  if (loading) {
    return <p className="text-black">Učitavanje...</p>;
  }

  const leagueName = LEAGUE_NAME[leagueCode];

  return (
    <div className="space-y-6">
      {/* TABLICA */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a] text-[#1a1a1a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {leagueName}
        </h1>

        <table className="w-full text-sm">
          <thead className="border-b border-[#c8b59a] text-[#0A5E2A]">
            <tr>
              <th className="py-2 w-6 text-left">#</th>
              <th className="py-2 text-left">Klub</th>
              <th className="py-2 w-10 text-center whitespace-nowrap">UT</th>
              <th className="py-2 w-10 text-center whitespace-nowrap">P</th>
              <th className="py-2 w-10 text-center whitespace-nowrap">N</th>
              <th className="py-2 w-10 text-center whitespace-nowrap">I</th>
              <th className="py-2 w-10 text-center whitespace-nowrap">G+</th>
              <th className="py-2 w-10 text-center whitespace-nowrap">G-</th>
              <th className="py-2 w-12 text-center whitespace-nowrap">GR</th>
              <th className="py-2 w-12 text-center whitespace-nowrap">Bod</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.team_id}
                className="border-b border-[#e3d4bf] bg-white"
              >
                <td className="py-2 px-1 w-6">{i + 1}</td>
                <td className="py-2">{s.team_name}</td>
                <td className="py-2 text-center w-10">{s.ut}</td>
                <td className="py-2 text-center w-10">{s.p}</td>
                <td className="py-2 text-center w-10">{s.n}</td>
                <td className="py-2 text-center w-10">{s.i}</td>
                <td className="py-2 text-center w-10">{s.gplus}</td>
                <td className="py-2 text-center w-10">{s.gminus}</td>
                <td className="py-2 text-center w-12">{s.gr}</td>
                <td className="py-2 text-center w-12 font-bold text-[#0A5E2A]">
                  {s.bodovi}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SLJEDEĆE KOLO */}
      <div className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {nextRoundNumber
              ? `Sljedeće kolo — ${nextRoundNumber}. kolo`
              : "Sljedeće kolo"}
          </h2>
          <a
            href={`/kola/${leagueCode}`}
            className="text-sm underline hover:no-underline"
          >
            Pogledaj sva kola →
          </a>
        </div>

        {nextRoundMatches.length === 0 ? (
          <p className="text-sm">Nema nadolazećih kola.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {nextRoundMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {m.home_team_name} — {m.away_team_name}
                </span>
                <span className="sm:text-right text-[#fcefd5]">
                  {m.date} {m.time && `u ${m.time}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
