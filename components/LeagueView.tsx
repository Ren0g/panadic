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
  placement: string;
  score: string;
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

    const { data: teams } = await supabase.from("teams").select("id,name");

    const teamMap: Record<string, string> = {};
    (teams || []).forEach((t: any) => {
      teamMap[t.id] = t.name;
    });

    // --------------------------
    // NORMAL LIGE
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
        .order("gplus", { ascending: false })
        .order("gminus", { ascending: true });

      const final =
        rawStandings?.map((s: any) => ({
          ...s,
          team_name: teamMap[s.team_id] ?? "Nepoznato",
        })) ?? [];

      setStandings(final);
    }

    // --------------------------
    // GOLD / SILVER
    // --------------------------
    if (leagueCode === "POC_GOLD" || leagueCode === "POC_SILVER") {
      const phaseLeague =
        leagueCode === "POC_GOLD" ? "POC_GOLD" : "POC_SILVER";

      const { data: regStandings } = await supabase
        .from("standings")
        .select("*")
        .in("league_code", ["POC_REG_A", "POC_REG_B"]);

      const regMap: Record<
        string,
        { bodovi: number; gplus: number; gminus: number; gr: number }
      > = {};

      regStandings?.forEach((s: any) => {
        regMap[s.team_id] = {
          bodovi: s.bodovi,
          gplus: s.gplus,
          gminus: s.gminus,
          gr: s.gr,
        };
      });

      const { data: fixtures } = await supabase
        .from("fixtures")
        .select("id, home_team_id, away_team_id")
        .eq("league_code", phaseLeague);

      const { data: results } = await supabase
        .from("results")
        .select("fixture_id, home_goals, away_goals");

      const phaseMap: any = {};

      fixtures?.forEach((f: any) => {
        const result = results?.find((r: any) => r.fixture_id === f.id);
        if (!result) return;

        const home = f.home_team_id;
        const away = f.away_team_id;

        if (!phaseMap[home])
          phaseMap[home] = { bodovi: 0, gplus: 0, gminus: 0, gr: 0, ut: 0, p: 0, n: 0, i: 0 };
        if (!phaseMap[away])
          phaseMap[away] = { bodovi: 0, gplus: 0, gminus: 0, gr: 0, ut: 0, p: 0, n: 0, i: 0 };

        const hg = result.home_goals;
        const ag = result.away_goals;

        phaseMap[home].ut++;
        phaseMap[away].ut++;

        phaseMap[home].gplus += hg;
        phaseMap[home].gminus += ag;
        phaseMap[home].gr += hg - ag;

        phaseMap[away].gplus += ag;
        phaseMap[away].gminus += hg;
        phaseMap[away].gr += ag - hg;

        if (hg > ag) {
          phaseMap[home].bodovi += 3;
          phaseMap[home].p++;
          phaseMap[away].i++;
        } else if (hg < ag) {
          phaseMap[away].bodovi += 3;
          phaseMap[away].p++;
          phaseMap[home].i++;
        } else {
          phaseMap[home].bodovi++;
          phaseMap[away].bodovi++;
          phaseMap[home].n++;
          phaseMap[away].n++;
        }
      });

      const finalRows: TableRow[] = [];

      Object.keys(phaseMap).forEach((teamId) => {
        const reg = regMap[teamId];

        finalRows.push({
          team_id: teamId,
          team_name: teamMap[teamId] ?? "Nepoznato",
          ut: phaseMap[teamId].ut,
          p: phaseMap[teamId].p,
          n: phaseMap[teamId].n,
          i: phaseMap[teamId].i,
          gplus: (reg?.gplus ?? 0) + phaseMap[teamId].gplus,
          gminus: (reg?.gminus ?? 0) + phaseMap[teamId].gminus,
          gr: (reg?.gr ?? 0) + phaseMap[teamId].gr,
          bodovi: (reg?.bodovi ?? 0) + phaseMap[teamId].bodovi,
        });
      });

      finalRows.sort((a, b) => {
        if (b.bodovi !== a.bodovi) return b.bodovi - a.bodovi;
        if (b.gr !== a.gr) return b.gr - a.gr;
        return b.gplus - a.gplus;
      });

      setStandings(finalRows);
    }

    // --------------------------
    // FINAL MATCHES
    // --------------------------
    const finalCode = FINAL_DB_CODE[leagueCode];

    const { data: finalFixtures } = await supabase
      .from("fixtures")
      .select("id, match_date, match_time, home_team_id, away_team_id, placement_label")
      .eq("league_code", finalCode)
      .eq("match_date", "2026-02-21")
      .order("match_time", { ascending: true });

    const fixtureIds = finalFixtures?.map((f: any) => f.id) ?? [];

    let resultMap: Record<string, string> = {};

    if (fixtureIds.length > 0) {
      const { data: results } = await supabase
        .from("results")
        .select("fixture_id, home_goals, away_goals")
        .in("fixture_id", fixtureIds);

      results?.forEach((r: any) => {
        if (r.home_goals !== null && r.away_goals !== null) {
          resultMap[String(r.fixture_id)] = `${r.home_goals}:${r.away_goals}`;
        }
      });
    }

    const formatted =
      finalFixtures?.map((f: any) => ({
        id: String(f.id),
        date: new Date(f.match_date).toLocaleDateString("hr-HR"),
        time: f.match_time?.substring(0, 5) ?? "",
        home: teamMap[f.home_team_id] ?? "Nepoznato",
        away: teamMap[f.away_team_id] ?? "Nepoznato",
        placement: f.placement_label ?? "",
        score: resultMap[String(f.id)] ?? "-:-",
      })) ?? [];

    setFinalMatches(formatted);

    setLoading(false);
  }

  if (loading) return <p>Učitavanje...</p>;

  return (
    <div className="space-y-6">

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

      {finalMatches.length > 0 && (
        <div className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">
            Finalne utakmice – 21.02.2026
          </h2>
          <ul className="space-y-3 text-sm">
            {finalMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#0d6b35] px-3 py-2 rounded-lg"
              >
                <span className="font-semibold">
                  {m.placement} — {m.home} — {m.away}
                </span>
                <span className="sm:text-right text-[#fcefd5]">
                  {m.date} u {m.time} | {m.score}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
