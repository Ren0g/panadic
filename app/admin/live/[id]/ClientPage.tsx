"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ClientPage({ fixtureId }: { fixtureId: string }) {
  const router = useRouter();
  const numericId = Number(fixtureId);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!numericId || !Number.isFinite(numericId)) {
      setError("Neispravan fixture ID.");
      setLoading(false);
      return;
    }

    loadMatch();
  }, [numericId]);

  async function loadMatch() {
    setLoading(true);

    const { data: fixture } = await supabase
      .from("fixtures")
      .select("*")
      .eq("id", numericId)
      .single();

    if (!fixture) {
      setError("Utakmica ne postoji.");
      setLoading(false);
      return;
    }

    const homeId = Number(fixture.home_team_id);
    const awayId = Number(fixture.away_team_id);

    const { data: teams } = await supabase
      .from("teams")
      .select("id,name")
      .in("id", [homeId, awayId]);

    const home = teams?.find((t) => Number(t.id) === homeId)?.name;
    const away = teams?.find((t) => Number(t.id) === awayId)?.name;

    setHomeTeam(home ?? "Nepoznato");
    setAwayTeam(away ?? "Nepoznato");

    const { data: results } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", numericId)
      .limit(1);

    if (results && results.length > 0) {
      setHomeGoals(results[0].home_goals);
      setAwayGoals(results[0].away_goals);
    }

    setLoading(false);
  }

  async function save() {
    if (!numericId) {
      setError("Neispravan fixture ID, ne mogu spremiti.");
      return;
    }

    const { data: existing } = await supabase
      .from("results")
      .select("id")
      .eq("fixture_id", numericId)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from("results")
        .update({
          home_goals: homeGoals,
          away_goals: awayGoals,
        })
        .eq("id", existing[0].id);
    } else {
      await supabase.from("results").insert({
        fixture_id: numericId,
        home_goals: homeGoals,
        away_goals: awayGoals,
      });
    }

    router.push("/admin/live");
  }

  if (loading) return <div className="p-4">Učitavanje...</div>;

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

      {error && (
        <div className="text-red-600 text-center mb-4">{error}</div>
      )}

      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a]">
        <div className="flex justify-between items-center text-xl font-bold mb-6">
          <span>{homeTeam}</span>
          <span>{awayTeam}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center text-center">
          <button
            onClick={() => setHomeGoals((v) => v + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            +
          </button>

          <div className="text-4xl font-bold">
            {homeGoals}:{awayGoals}
          </div>

          <button
            onClick={() => setAwayGoals((v) => v + 1)}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            +
          </button>

          <button
            onClick={() => setHomeGoals((v) => Math.max(0, v - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            –
          </button>

          <div></div>

          <button
            onClick={() => setAwayGoals((v) => Math.max(0, v - 1))}
            className="text-4xl font-bold bg-white border rounded-lg py-4 shadow"
          >
            –
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
