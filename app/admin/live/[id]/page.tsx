"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LiveMatch({ params }: { params: { id: string } }) {
  const fixtureId = Number(params.id);
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, []);

  async function loadMatch() {
    setLoading(true);

    const { data, error } = await supabase
      .from("fixtures")
      .select(
        `
        id,
        match_date,
        match_time,
        home:home_team_id ( name ),
        away:away_team_id ( name ),
        results:results ( home_goals, away_goals )
      `
      )
      .eq("id", fixtureId)
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const result = data.results?.[0] || {};

    setMatch({
      home_team: data.home?.name ?? "",
      away_team: data.away?.name ?? "",
    });

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

  if (loading || !match) return <div className="p-4">Učitavanje...</div>;

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
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center text-center">

          {/* HOME - */}
          <button
            onClick={() => setHomeGoals((x) => Math.max(0, x - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            –
          </button>

          {/* RESULT */}
          <div className="text-4xl font-bold">{homeGoals}:{awayGoals}</div>

          {/* HOME + */}
          <button
            onClick={() => setHomeGoals((x) => x + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            +
          </button>

          {/* AWAY - */}
          <button
            onClick={() => setAwayGoals((x) => Math.max(0, x - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            –
          </button>

          <div></div>

          {/* AWAY + */}
          <button
            onClick={() => setAwayGoals((x) => x + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={save}
        className="w-full bg-[#0A5E2A] text-white py-3 rounded-xl shadow text-lg"
      >
        Spremi rezultat
      </button>
    </div>
  );
}
