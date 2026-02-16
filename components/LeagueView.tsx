"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LeagueCode =
  | "PIONIRI"
  | "MLADJI"
  | "PRSTICI"
  | "POC_GOLD"
  | "POC_SILVER";

const LEAGUE_DB_CODE: Record<LeagueCode, string> = {
  PIONIRI: "PIONIRI_REG",
  MLADJI: "MLPIONIRI_REG",
  PRSTICI: "PRSTICI_REG",
  POC_GOLD: "POC_GOLD",
  POC_SILVER: "POC_SILVER",
};

const FINAL_DB_CODE: Record<LeagueCode, string> = {
  PIONIRI: "PIONIRI_FINAL",
  MLADJI: "MLPIONIRI_FINAL",
  PRSTICI: "PRSTICI_FINAL",
  POC_GOLD: "POC_GOLD_FINAL",
  POC_SILVER: "POC_SILVER_FINAL",
};

const LEAGUE_NAME: Record<LeagueCode, string> = {
  PIONIRI: "Pioniri",
  MLADJI: "Mlađi pioniri",
  PRSTICI: "Prstići",
  POC_GOLD: "Početnici – Zlatna liga",
  POC_SILVER: "Početnici – Srebrna liga",
};

type TableRow = {
  team_id: string;
  team_name: string;
  ut: number;
  p: number;
  n: number;
  i: number;
  gplus: number;
  gminus: number;
  gr: number;
  bodovi: number;
};

type FinalMatch = {
  id: string;
  date: string;
  time: string;
  home: string;
  away: string;
  placement_label: string | null;
};

export default function LeagueView({ leagueCode }: { leagueCode: LeagueCode }) {
  const [standings, setStandings] = useState<TableRow[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [leagueCode]);

  async function loadData() {
    setLoading(true);

    const { data: teams } = await supabase
      .from("teams")
      .select("id,name");

    const teamMap: Record<string, string> = {};
    (teams || []).forEach((t: any) => {
      teamMap[t.id] = t.name;
    });

    // ---------------------------
    // STANDINGS (NETAKNUTA LOGIKA)
    // ---------------------------

    const dbLeagueCode = LEAGUE_DB_CODE[leagueCode];

    const { data: rawStandings } = await supabase
      .from("standings")
      .select("*")
      .eq("league_code", dbLeagueCode)
      .order("bodovi", { ascending: false })
      .order("gr", { ascending: false })
      .order("gplus", { ascending: false })
      .order("gminus", { ascending: true });

    const final =
      rawStandings?.map((s: any) => ({
        ...s,
        team_name: teamMap[s.team_id] ?? "Nepoznato",
      })) ?? [];

    setStandings(final);

    // ---------------------------
    // FINAL MATCHES
    // ---------------------------

    const finalCode = FINAL_DB_CODE[leagueCode];

    const { data: finalFixtures } = await supabase
      .from("fixtures")
      .select(
        "id, match_date, match_time, placement_label, home_team_id, away_team_id"
      )
      .eq("league_code", finalCode)
      .eq("match_date", "2026-02-21")
      .order("match_time", { ascending: true });

    const formatted =
      finalFixtures?.map((f: any) => ({
        id: f.id,
        date: new Date(f.match_date).toLocaleDateString("hr-HR"),
        time: f.match_time?.substring(0, 5) ?? "",
        home: teamMap[f.home_team_id] ?? "Nepoznato",
        away: teamMap[f.away_team_id] ?? "Nepoznato",
        placement_label: f.placement_label,
      })) ?? [];

    setFinalMatches(formatted);
    setLoading(false);
  }

  if (loading) return <p className="text-black">Učitavanje...</p>;

  return (
    <div className="space-y-6">

      {/* TABLICA – ORIGINALNI IZGLED */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a] text-[#1a1a1a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {LEAGUE_NAME[leagueCode]}
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
              <tr
                key={s.team_id}
                className="border-b border-[#e3d4bf] bg-white"
              >
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

      {/* FINAL DAY ISPRAVNO */}
      {finalMatches.length > 0 && (
        <div className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Finalni dan – 21.02.2026</h2>
          <ul className="space-y-3 text-sm">
            {finalMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#0d6b35] px-3 py-2 rounded-lg"
              >
                <span className="font-medium">
                  {m.home} — {m.away}
                </span>

                <span className="sm:text-right text-[#fcefd5]">
                  {m.date} {m.time && `u ${m.time}`}{" "}
                  {m.placement_label && `• ${m.placement_label}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
