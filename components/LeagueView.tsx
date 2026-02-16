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

export default function LeagueView({ leagueCode }: { leagueCode: LeagueCode }) {
  const [standings, setStandings] = useState<TableRow[]>([]);
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

    // --------------------------
    // NORMAL LEAGUES
    // --------------------------
    if (
      leagueCode === "PIONIRI" ||
      leagueCode === "MLADJI" ||
      leagueCode === "PRSTICI"
    ) {
      const dbLeagueCode = LEAGUE_DB_CODE[leagueCode];

      const { data: rawStandings } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", dbLeagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false })
        .order("gplus", { ascending: false });

      const final =
        rawStandings?.map((s: any) => ({
          ...s,
          team_name: teamMap[s.team_id] ?? "Nepoznato",
        })) ?? [];

      setStandings(final);
      setLoading(false);
      return;
    }

    // --------------------------
    // GOLD / SILVER
    // --------------------------

    const phaseLeague =
      leagueCode === "POC_GOLD" ? "POC_GOLD" : "POC_SILVER";

    // 1) REG standings
    const { data: regStandings } = await supabase
      .from("standings")
      .select("*")
      .in("league_code", ["POC_REG_A", "POC_REG_B"]);

    const regMap: Record<
      string,
      { bodovi: number; gplus: number; gminus: number; gr: number }
    > = {};

    regStandings?.forEach((s: any) => {
      regMap[teamMap[s.team_id]] = {
        bodovi: s.bodovi,
        gplus: s.gplus,
        gminus: s.gminus,
        gr: s.gr,
      };
    });

    // 2) Phase fixtures + results
    const { data: fixtures } = await supabase
      .from("fixtures")
      .select("id, home_team_id, away_team_id")
      .eq("league_code", phaseLeague);

    const { data: results } = await supabase
      .from("results")
      .select("fixture_id, home_goals, away_goals");

    const phaseMap: Record<
      string,
      { bodovi: number; gplus: number; gminus: number; gr: number; ut: number; p: number; n: number; i: number }
    > = {};

    fixtures?.forEach((f: any) => {
      const result = results?.find((r: any) => r.fixture_id === f.id);
      if (!result) return;

      const homeName = teamMap[f.home_team_id];
      const awayName = teamMap[f.away_team_id];

      const hg = result.home_goals;
      const ag = result.away_goals;

      if (!phaseMap[homeName])
        phaseMap[homeName] = { bodovi: 0, gplus: 0, gminus: 0, gr: 0, ut: 0, p: 0, n: 0, i: 0 };
      if (!phaseMap[awayName])
        phaseMap[awayName] = { bodovi: 0, gplus: 0, gminus: 0, gr: 0, ut: 0, p: 0, n: 0, i: 0 };

      phaseMap[homeName].ut++;
      phaseMap[awayName].ut++;

      phaseMap[homeName].gplus += hg;
      phaseMap[homeName].gminus += ag;
      phaseMap[homeName].gr += hg - ag;

      phaseMap[awayName].gplus += ag;
      phaseMap[awayName].gminus += hg;
      phaseMap[awayName].gr += ag - hg;

      if (hg > ag) {
        phaseMap[homeName].bodovi += 3;
        phaseMap[homeName].p++;
        phaseMap[awayName].i++;
      } else if (hg < ag) {
        phaseMap[awayName].bodovi += 3;
        phaseMap[awayName].p++;
        phaseMap[homeName].i++;
      } else {
        phaseMap[homeName].bodovi += 1;
        phaseMap[awayName].bodovi += 1;
        phaseMap[homeName].n++;
        phaseMap[awayName].n++;
      }
    });

    // 3) Merge REG + Phase
    const finalRows: TableRow[] = [];

    Object.keys(phaseMap).forEach((teamName) => {
      const reg = regMap[teamName];
      const phase = phaseMap[teamName];

      finalRows.push({
        team_id: teamName,
        team_name: teamName,
        ut: phase.ut,
        p: phase.p,
        n: phase.n,
        i: phase.i,
        gplus: (reg?.gplus ?? 0) + phase.gplus,
        gminus: (reg?.gminus ?? 0) + phase.gminus,
        gr: (reg?.gr ?? 0) + phase.gr,
        bodovi: (reg?.bodovi ?? 0) + phase.bodovi,
      });
    });

    finalRows.sort((a, b) => {
      if (b.bodovi !== a.bodovi) return b.bodovi - a.bodovi;
      if (b.gr !== a.gr) return b.gr - a.gr;
      return b.gplus - a.gplus;
    });

    setStandings(finalRows);
    setLoading(false);
  }

  if (loading) return <p>Učitavanje...</p>;

  return (
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
            <tr key={i} className="border-b border-[#e3d4bf] bg-white">
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
  );
}
