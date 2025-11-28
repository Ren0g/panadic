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

export default function LeagueView({ leagueCode }: { leagueCode: LeagueCode }) {
  const [standings, setStandings] = useState<any[]>([]);
  const [nextRoundMatches, setNextRoundMatches] = useState<any[]>([]);
  const [nextRoundNumber, setNextRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const dbLeagueCode = LEAGUE_DB_CODE[leagueCode];

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name");

      const teamMap: Record<string, string> = {};
      teams?.forEach((t) => (teamMap[t.id] = t.name));

      const { data: rawStandings } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", dbLeagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      const final = (rawStandings || []).map((s) => ({
        ...s,
        team_name: teamMap[s.team_id] ?? "Nepoznato",
      }));

      setStandings(final);

      const { data: rawFixtures } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", dbLeagueCode);

      const now = new Date();

      const fixtures = (rawFixtures || []).map((f: any) => {
        const fullDate = new Date(`${f.match_date}T${f.match_time}`);

        return {
          ...f,
          fullDateTime: fullDate,
          dateFormatted: new Date(f.match_date).toLocaleDateString("hr-HR"),
          timeFormatted: f.match_time.substring(0, 5),
          home_team_name: teamMap[f.home_team_id] ?? "Nepoznato",
          away_team_name: teamMap[f.away_team_id] ?? "Nepoznato",
        };
      });

      const future = fixtures.filter((f: any) => f.fullDateTime > now);

      if (future.length === 0) {
        setNextRoundMatches([]);
        setNextRoundNumber(null);
        setLoading(false);
        return;
      }

      const nextRound = Math.min(...future.map((f: any) => f.round));

      const matches = future
        .filter((f: any) => f.round === nextRound)
        .sort((a: any, b: any) => a.fullDateTime - b.fullDateTime);

      setNextRoundNumber(nextRound);
      setNextRoundMatches(matches);
      setLoading(false);
    };

    loadData();
  }, [leagueCode]);

  if (loading) return <p className="text-black">Učitavanje...</p>;

  const leagueName = LEAGUE_NAME[leagueCode];

  return (
    <div className="space-y-6">
      {/* TABLICA */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">{leagueName}</h1>

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

      {/* SLJEDEĆE KOLO */}
      <div className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">
          {nextRoundNumber
            ? `Sljedeće kolo — ${nextRoundNumber}. kolo`
            : "Sljedeće kolo"}
        </h2>

        {nextRoundMatches.length === 0 ? (
          <p className="text-sm">Nema nadolazećih kola.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {nextRoundMatches.map((m: any) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#0d6b35] px-3 py-2 rounded-lg"
              >
                <span className="font-medium">
                  {m.home_team_name} — {m.away_team_name}
                </span>

                <span className="sm:text-right text-[#fcefd5]">
                  {m.dateFormatted} u {m.timeFormatted}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() =>
              (window.location.href = `/kola?league=${leagueCode}`)
            }
            className="px-4 py-2 bg-white text-[#0A5E2A] font-semibold rounded-full border border-[#e3d4bf] shadow hover:bg-[#f7f1e6]"
          >
            Pogledaj sva kola →
          </button>
        </div>
      </div>
    </div>
  );
}
