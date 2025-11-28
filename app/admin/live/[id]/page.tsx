"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LiveMatch({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fixtureId = params.id; // FIX — STRING, NE NUMBER

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, []);

  async function loadMatch() {
    setLoading(true);

    // 1) Ucitaj fixture po ID-u (kao string)
    const { data: fixture, error: fxErr } = await supabase
      .from("fixtures")
      .select("*")
      .eq("id", fixtureId)
      .single();

    if (fxErr || !fixture) {
      console.error("Fixture error:", fxErr);
      setLoading(false);
      return;
    }

    // 2) Ucitaj timove
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name");

    const home = teams?.find(
      (t) => String(t.id) === String(fixture.home_team_id)
    );
    const away = teams?.find(
      (t) => String(t.id) === String(fixture.away_team_id)
    );

    setHomeTeam(home?.name ?? "Nepoznato");
    setAwayTeam(away?.name ?? "Nepoznato");

    // 3) Dohvati rezultat
    const { data: results } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId);

    const result = results?.[0];

    setHomeGoals(result?.home_goals ?? 0);
    setAwayGoals(result?.away_goals ?? 0);

    setLoading(false);
  }

  async function save() {
    await supabase.from("results").upsert({
      fixture_id: fixtureId,     // FIX—STRING MATCHES DB
      home_goals: homeGoals,
      away_goals: awayGoals,
    });

    router.push("/admin/live");
  }

  if (loading) {
    return <div className="p-4 text-center text-lg">Učitavanje...</div>;
  }

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
        <div className="flex justify-between items-center text-xl font-bold mb-6">
          <span>{homeTeam}</span>
          <span>{awayTeam}</span>
        </div>

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

      <button
        onClick={save}
        className="w-full bg-[#0A5E2A] text-white py-3 rounded-xl shadow text-lg active:scale-95"
      >
        Spremi rezultat
      </button>

    </div>
  );
}
