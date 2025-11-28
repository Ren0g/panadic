"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type FixtureType = {
  id: number;
  match_date: string;
  match_time: string;
  home_team_id: number;
  away_team_id: number;
};

type TeamType = {
  id: number;
  name: string;
};

type ResultType = {
  home_goals: number | null;
  away_goals: number | null;
};

export default function LiveMatch({ params }: { params: { id: string } }) {
  const fixtureId = parseInt(params.id, 10);
  const router = useRouter();

  if (!fixtureId || Number.isNaN(fixtureId)) {
    return (
      <div className="p-4 text-center text-red-600">
        Neispravan ID utakmice.
      </div>
    );
  }

  const [match, setMatch] = useState<FixtureType | null>(null);
  const [homeTeam, setHomeTeam] = useState<string>("");
  const [awayTeam, setAwayTeam] = useState<string>("");
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, []);

  async function loadMatch() {
    setLoading(true);

    // 1) UČITAJ FIXTURE
    const { data: fixture, error: fxErr } = await supabase
      .from("fixtures")
      .select("*")
      .eq("id", fixtureId)
      .single();

    if (fxErr || !fixture) {
      console.error(fxErr);
      setLoading(false);
      return;
    }

    setMatch(fixture);

    // 2) TIMOVI
    const { data: teams } = await supabase
      .from("teams")
      .select("id,name")
      .in("id", [fixture.home_team_id, fixture.away_team_id]);

    const home = teams?.find((t: TeamType) => t.id === fixture.home_team_id);
    const away = teams?.find((t: TeamType) => t.id === fixture.away_team_id);

    setHomeTeam(home?.name ?? "");
    setAwayTeam(away?.name ?? "");

    // 3) REZULTATI
    const { data: resultRows } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId);

    const result: ResultType = resultRows?.[0] || {
      home_goals: 0,
      away_goals: 0,
    };

    setHomeGoals(result.home_goals ?? 0);
    setAwayGoals(result.away_goals ?? 0);

    setLoading(false);
  }

  async function save() {
    await supabase
      .from("results")
      .upsert({
        fixture_id: fixtureId,
        home_goals: homeGoals,
        away_goals: awayGoals,
      });

    router.push("/admin/live");
  }

  if (loading || !match)
    return <div className="p-4 text-center text-lg">Učitavanje...</div>;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">

      <button
        onClick={() => router.push("/admin/live")}
        className="px-4 py-2 bg-[#f7f1e6] border border-[#c8b59a] rounded-full text-[#0A5E2A] shadow"
      >
        ← Natrag
      </button>

      <h1 className="text-2xl font-bold text-center text-[#0A5E2A]">
        LIVE rezultat
      </h1>

      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a]">
        <div className="flex justify-between items-center text-lg font-bold mb-4">
          <span>{homeTeam}</span>
          <span>{awayTeam}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center text-center">

          <button
            onClick={() => setHomeGoals((v) => Math.max(0, v - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            –
          </button>

          <div className="text-4xl font-bold">
            {homeGoals}:{awayGoals}
          </div>

          <button
            onClick={() => setHomeGoals((v) => v + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            +
          </button>

          <button
            onClick={() => setAwayGoals((v) => Math.max(0, v - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            –
          </button>

          <div></div>

          <button
            onClick={() => setAwayGoals((v) => v + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={save}
        className="w-full bg-[#0A5E2A] text-white py-3 rounded-xl shadow text-lg active:scale-95"
      >
        Spremi rezultat
      </button>
    </div>
  );
}
