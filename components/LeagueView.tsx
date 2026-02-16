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

    // --------------------------
    // STANDINGS (postojeća logika)
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
    } else {
      // GOLD / SILVER logika ostaje ista (nije dirana)
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
        regMap[teamMap[s.team_id]] = {
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

        const home = teamMap[f.home_team_id];
        const away = teamMap[f.away_team_id];

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
          phaseMap[home].bodovi += 1;
          phaseMap[away].bodovi += 1;
          phaseMap[home].n++;
          phaseMap[away].n++;
        }
      });

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
    }

    // --------------------------
    // FINAL MATCHES ZA ODABRANU LIGU
    // --------------------------

    const finalCode = LEAGUE_DB_CODE[leagueCode].replace("_REG", "_FINAL");

    const { data: finalFixtures } = await supabase
      .from("fixtures")
      .select("id, match_date, match_time, placement_label, home_team_id, away_team_id")
      .eq("league_code", finalCode)
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

  if (loading) return <p>Učitavanje...</p>;

  return (
    <div className="space-y-6">

      {/* TABLICA */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a] text-[#1a1a1a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {LEAGUE_NAME[leagueCode]}
        </h1>

        <table className="w-full text-sm">
          <thead className="border-b border-[#c8b59a] text-[#0A5E2A]">
            <tr>
              <th>#</th>
              <th>Klub</th>
              <th>UT</th>
              <th>P</th>
              <th>N</th>
              <th>I</th>
              <th>G+</th>
              <th>G-</th>
              <th>GR</th>
              <th>Bod</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={i} className="border-b border-[#e3d4bf] bg-white">
                <td>{i + 1}</td>
                <td>{s.team_name}</td>
                <td>{s.ut}</td>
                <td>{s.p}</td>
                <td>{s.n}</td>
                <td>{s.i}</td>
                <td>{s.gplus}</td>
                <td>{s.gminus}</td>
                <td>{s.gr}</td>
                <td className="font-bold text-[#0A5E2A]">{s.bodovi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FINAL MATCHES */}
      {finalMatches.length > 0 && (
        <div className="bg-[#0A5E2A] text-[#f7f1e6] p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Finalni dan</h2>
          <ul className="space-y-3 text-sm">
            {finalMatches.map((m) => (
              <li key={m.id} className="bg-[#0d6b35] px-3 py-2 rounded-lg">
                <div className="font-medium">
                  {m.home} — {m.away}
                </div>
                <div className="text-xs text-[#fcefd5]">
                  {m.date} {m.time && `u ${m.time}`}{" "}
                  {m.placement_label && `• ${m.placement_label}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
