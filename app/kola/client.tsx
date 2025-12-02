"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Fixture = {
  id: string;
  round: number;
  match_date: string | null;
  match_time: string | null;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
};

export default function ClientKola({ leagueCode }: { leagueCode: string }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllFixtures();
  }, [leagueCode]);

  async function loadAllFixtures() {
    setLoading(true);

    const { data, error } = await supabase
      .from("fixtures")
      .select(
        `
        id,
        round,
        match_date,
        match_time,
        home:home_team_id ( name ),
        away:away_team_id ( name ),
        result:results!fixture_id ( home_goals, away_goals )
      `
      )
      .eq("league_code", leagueCode)
      .order("round", { ascending: true })
      .order("match_date", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const parsed: Fixture[] = (data || []).map((f: any) => {
      const homeRel = Array.isArray(f.home) ? f.home[0] : f.home;
      const awayRel = Array.isArray(f.away) ? f.away[0] : f.away;

      return {
        id: f.id,
        round: f.round || 0,
        match_date: f.match_date,
        match_time: f.match_time,
        home_team: homeRel?.name ?? "",
        away_team: awayRel?.name ?? "",
        home_goals: f.result?.home_goals ?? null,
        away_goals: f.result?.away_goals ?? null,
      };
    });

    setFixtures(parsed);
    setLoading(false);
  }

  if (loading) return <div>Učitavanje…</div>;

  const grouped = fixtures.reduce((acc: any, f) => {
    if (!acc[f.round]) acc[f.round] = [];
    acc[f.round].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.keys(grouped)
        .sort((a, b) => Number(a) - Number(b))
        .map((round) => (
          <div
            key={round}
            className="rounded-xl border border-[#e2d5bd] bg-[#f7f1e6] p-4"
          >
            <h2 className="text-xl font-bold text-[#0b5b2a] mb-3">
              {round}. kolo
            </h2>

            <div className="space-y-2">
              {grouped[round].map((m: Fixture) => {
                const date = m.match_date
                  ? new Date(m.match_date).toLocaleDateString("hr-HR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "-";

                const time = m.match_time
                  ? m.match_time.substring(0, 5)
                  : "";

                const hasResult =
                  m.home_goals !== null && m.away_goals !== null;

                return (
                  <div
                    key={m.id}
                    className="flex justify-between items-center bg-white py-2 px-3 rounded-lg border border-[#e2d5bd]"
                  >
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">
                        {m.home_team} vs {m.away_team}
                      </div>
                      <div className="text-xs text-gray-500">
                        {date} • {time}
                      </div>
                    </div>

                    <div className="text-sm font-bold text-[#0b5b2a] min-w-[40px] text-center">
                      {hasResult ? (
                        <span>{m.home_goals}:{m.away_goals}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
