"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LiveMatch({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fixtureId = Number(params.id); // Bigint → number

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, []);

  // -------------------------------------------------------
  // LOAD MATCH + TEAMS + RESULT
  // -------------------------------------------------------
  async function loadMatch() {
    setLoading(true);

    // 1) Dohvati fixture
    const { data: fixture, error: fixtureErr } = await supabase
      .from("fixtures")
      .select("*")
      .eq("id", fixtureId)
      .single();

    if (fixtureErr || !fixture) {
      console.error("Fixture load error:", fixtureErr);
      setLoading(false);
      return;
    }

    // 2) Dohvati imena timova
    const teamIds = [fixture.home_team_id, fixture.away_team_id];

    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    const home = teams?.find((t) => Number(t.id) === Number(fixture.home_team_id));
    const away = teams?.find((t) => Number(t.id) === Number(fixture.away_team_id));

    setHomeTeam(home?.name ?? "Nepoznato");
    setAwayTeam(away?.name ?? "Nepoznato");

    // 3) Dohvati postojeći rezultat
    const { data: results } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId)
      .limit(1);

    if (results && results.length > 0) {
      setHomeGoals(results[0].home_goals);
      setAwayGoals(results[0].away_goals);
    } else {
      setHomeGoals(0);
      setAwayGoals(0);
    }

    setLoading(false);
  }

  // -------------------------------------------------------
  // SAVE
  // -------------------------------------------------------
  async function save() {
    await supabase.from("results").upsert({
      fixture_id: fixtureId,
      home_goals: homeGoals,
      away_goals: awayGoals,
    });

    router.push("/admin/live");
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-lg text-[#0A5E2A]">
        Učitavanje...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">

      {/* BACK BUTTON */}
      <button
        onClick={() => router.push("/admin/live")}
        className="px-4 py-2 bg-[#f7f1e6] border border-[#c8b59a] rounded-full text-[#0A5E2A] shadow"
      >
        ← Natrag
      </button>

      {/* TITLE */}
      <h1 className="text-2xl font-bold text-center text-[#0A5E2A]">
        LIVE rezultat
      </h1>

      {/* MATCH BOX */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a]">
        <div className="flex justify-between items-center text-xl font-bold mb-6">
          <span>{homeTeam}</span>
          <span>{awayTeam}</span>
        </div>

        {/* SCORE CONTROLS */}
        <div className="grid grid-cols-3 gap-4 items-center text-center">

          {/* HOME + */}
          <button
            onClick={() => setHomeGoals((v) => v + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            +
          </button>

          {/* SCORE */}
          <div className="text-4xl font-bold">
            {homeGoals}:{awayGoals}
          </div>

          {/* AWAY + */}
          <button
            onClick={() => setAwayGoals((v) => v + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            +
          </button>

          {/* HOME - */}
          <button
            onClick={() => setHomeGoals((v) => Math.max(0, v - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            –
          </button>

          <div></div>

          {/* AWAY - */}
          <button
            onClick={() => setAwayGoals((v) => Math.max(0, v - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow active:scale-95"
          >
            –
          </button>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <button
        onClick={save}
        className="w-full bg-[#0A5E2A] text-white py-3 rounded-xl shadow text-lg active:scale-95"
      >
        Spremi rezultat
      </button>
    </div>
  );
}
