"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type ResultRow = {
  id: number;
  fixture_id: number;
  home_goals: number;
  away_goals: number;
};

export default function LiveMatch({ params }: { params: { id: string } }) {
  const router = useRouter();

  const fixtureId = Number(params.id);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
      console.error("Neispravan fixtureId u URL-u:", params.id);
      setLoading(false);
      return;
    }

    loadMatch();
  }, [fixtureId]);

  async function loadMatch() {
    setLoading(true);

    // 1) Fixture
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

    // 2) Timovi
    const teamIds = [fixture.home_team_id, fixture.away_team_id];

    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamsErr) {
      console.error("Teams load error:", teamsErr);
    }

    const home =
      teams?.find((t) => Number(t.id) === Number(fixture.home_team_id))
        ?.name ?? "Nepoznato";
    const away =
      teams?.find((t) => Number(t.id) === Number(fixture.away_team_id))
        ?.name ?? "Nepoznato";

    setHomeTeam(home);
    setAwayTeam(away);

    // 3) Postojeći rezultat
    const { data: resRows, error: resErr } = await supabase
      .from("results")
      .select("id, fixture_id, home_goals, away_goals")
      .eq("fixture_id", fixtureId)
      .limit(1);

    if (resErr) {
      console.error("Results load error:", resErr);
    }

    if (resRows && resRows.length > 0) {
      const r = resRows[0] as ResultRow;
      setHomeGoals(r.home_goals ?? 0);
      setAwayGoals(r.away_goals ?? 0);
    } else {
      setHomeGoals(0);
      setAwayGoals(0);
    }

    setLoading(false);
  }

  async function save() {
    setSaveError(null);

    if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
      setSaveError("Neispravan fixture ID, ne mogu spremiti rezultat.");
      return;
    }

    // Provjeri postoji li već rezultat
    const { data: existingRows, error: checkErr } = await supabase
      .from("results")
      .select("id")
      .eq("fixture_id", fixtureId)
      .limit(1);

    if (checkErr) {
      console.error("Check results error:", checkErr);
      setSaveError("Greška pri provjeri postojećeg rezultata.");
      return;
    }

    if (existingRows && existingRows.length > 0) {
      // UPDATE
      const existingId = existingRows[0].id as number;

      const { error: updErr } = await supabase
        .from("results")
        .update({
          home_goals: homeGoals,
          away_goals: awayGoals,
        })
        .eq("id", existingId);

      if (updErr) {
        console.error("Update error:", updErr);
        setSaveError("Greška pri spremanju rezultata.");
        return;
      }
    } else {
      // INSERT
      const { error: insErr } = await supabase.from("results").insert({
        fixture_id: fixtureId,
        home_goals: homeGoals,
        away_goals: awayGoals,
      });

      if (insErr) {
        console.error("Insert error:", insErr);
        setSaveError("Greška pri spremanju rezultata.");
        return;
      }
    }

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

      {saveError && (
        <div className="text-sm text-red-600 text-center">{saveError}</div>
      )}

      <button
        onClick={save}
        className="w-full bg-[#0A5E2A] text-white py-3 rounded-xl shadow text-lg active:scale-95"
      >
        Spremi rezultat
      </button>
    </div>
  );
}
