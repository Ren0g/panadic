"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export default function LeagueView({
  leagueCode,
  refreshKey,
}: {
  leagueCode: "PIONIRI" | "MLADJI";
  refreshKey?: number;
}) {
  const [standings, setStandings] = useState<
    (Standing & { team_name: string })[]
  >([]);
  const [nextMatch, setNextMatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const leagueName = leagueCode === "PIONIRI" ? "Pioniri" : "Mlađi pioniri";
  const banTeamName =
    leagueCode === "PIONIRI" ? "Ban Jelačić 2" : "Ban Jelačić";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // ---------------------------
      // 1) Load teams
      // ---------------------------
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name");

      const teamMap: Record<string, string> = {};
      teams?.forEach((t) => (teamMap[t.id] = t.name));

      // ---------------------------
      // 2) Load standings
      // ---------------------------
      const { data: rawStandings } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", leagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      const finalStandings =
        rawStandings?.map((s: Standing) => ({
          ...s,
          team_name: teamMap[s.team_id] ?? "Nepoznato",
        })) ?? [];

      setStandings(finalStandings);

      // ---------------------------
      // 3) Find Ban Jelačić team
      // ---------------------------
      const banTeam = finalStandings.find(
        (t) => t.team_name === banTeamName
      );

      if (!banTeam) {
        setNextMatch(null);
        setLoading(false);
        return;
      }

      // ---------------------------
      // 4) Load fixtures (next match)
      // ---------------------------
      const { data: rawFixtures } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", leagueCode)
        .or(
          `home_team_id.eq.${banTeam.team_id},away_team_id.eq.${banTeam.team_id}`
        );

      const now = new Date();

      const future = (rawFixtures || [])
        .map((f: any) => ({
          ...f,
          home_team_name: teamMap[f.home_team_id] ?? "Nepoznato",
          away_team_name: teamMap[f.away_team_id] ?? "Nepoznato",
          fullDate: new Date(
            `${f.match_date}T${f.match_time_start || "00:00"}`
          ),
          match_time:
            f.match_time_start && f.match_time_end
              ? `${f.match_time_start} - ${f.match_time_end}`
              : f.match_time_start || f.match_time_end || "",
        }))
        .filter((f) => f.fullDate > now)
        .sort((a, b) => a.fullDate - b.fullDate);

      setNextMatch(future[0] ?? null);

      setLoading(false);
    };

    loadData();
  }, [leagueCode, refreshKey]);

  if (loading) return <p className="text-black">Učitavanje...</p>;

  return (
    <div className="space-y-6">

      {/* ------------------------- */}
      {/* TABLICA */}
      {/* ------------------------- */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a] text-[#1a1a1a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {leagueName} — Tablica
        </h1>

        <table className="w-full text-sm">
          <thead className="border-b border-[#c8b59a] text-[#0A5E2A]">
            <tr>
              <th className="py-2 w-6 text-left">#</th>

              {/* Klub = fleksibilno, sve ostalo fiksno */}
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

                {/* Klub = bez fiksne širine, dopuštamo širenje */}
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

      {/* ------------------------- */}
      {/* IDUĆA UTAKMICA */}
      {/* ------------------------- */}
      <div className="bg-[#0A5E2A] text-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">
          Iduća utakmica — {banTeamName}
        </h2>

        {nextMatch ? (
          <div className="space-y-1 text-sm">
            <p>
              <b>Par:</b>{" "}
              {nextMatch.home_team_name} — {nextMatch.away_team_name}
            </p>
            <p>
              <b>Kolo:</b> {nextMatch.round}
            </p>
            <p>
               <b>Datum:</b> {new Date(nextMatch.match_date).toLocaleDateString("hr-HR")} u {nextMatch.match_time}
            </p>

          </div>
        ) : (
          <p>Nema nadolazećih utakmica.</p>
        )}
      </div>

    </div>
  );
}
