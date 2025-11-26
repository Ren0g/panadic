"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LeagueView from "@/components/LeagueView";
import { recalculateStandings } from "@/lib/recalculateStandings";

type Fixture = {
  id: string;
  league_code: string;
  round: string;
  match_date: string;
  match_time_start?: string | null;
  match_time_end?: string | null;
  home_team_id: string;
  away_team_id: string;
};

type Result = {
  home_goals: number;
  away_goals: number;
};

export default function AdminPage() {
  const [leagueCode, setLeagueCode] = useState<"PIONIRI" | "MLADJI">("PIONIRI");
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, Result | null>>({});
  const [teamMap, setTeamMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [editFixtureId, setEditFixtureId] = useState<string | null>(null);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [saving, setSaving] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const loadFixtures = async () => {
    setLoading(true);

    // TEAMS
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, league_code");

    const tm: Record<string, string> = {};
    teams
      ?.filter((t) => t.league_code === leagueCode)
      .forEach((t) => (tm[t.id] = t.name));
    setTeamMap(tm);

    // FIXTURES
    const { data: fixturesData } = await supabase
      .from("fixtures")
      .select("*")
      .eq("league_code", leagueCode)
      .order("round")
      .order("match_date")
      .order("match_time_start");

    const decorated =
      fixturesData?.map((f) => ({
        ...f,
        home_team: tm[f.home_team_id],
        away_team: tm[f.away_team_id],
        match_time:
          f.match_time_start && f.match_time_end
            ? `${f.match_time_start} - ${f.match_time_end}`
            : f.match_time_start || f.match_time_end || "",
      })) || [];

    setFixtures(decorated);

    // RESULTS
    const { data: resultsData } = await supabase.from("results").select("*");
    const rmap: Record<string, Result | null> = {};

    resultsData?.forEach((r) => {
      rmap[r.fixture_id] = {
        home_goals: r.home_goals,
        away_goals: r.away_goals,
      };
    });

    setResults(rmap);
    setLoading(false);
  };

  useEffect(() => {
    loadFixtures();
  }, [leagueCode]);

  const startEditing = (fixture: Fixture) => {
    setEditFixtureId(fixture.id);
    const r = results[fixture.id];
    setHomeGoals(r ? String(r.home_goals) : "");
    setAwayGoals(r ? String(r.away_goals) : "");
  };

  const saveResult = async () => {
    if (!editFixtureId) return;

    const h = Number(homeGoals);
    const a = Number(awayGoals);

    if (isNaN(h) || isNaN(a)) {
      alert("Golovi moraju biti brojevi.");
      return;
    }

    setSaving(true);

    const existing = results[editFixtureId];

    try {
      if (existing) {
        await supabase
          .from("results")
          .update({ home_goals: h, away_goals: a })
          .eq("fixture_id", editFixtureId);
      } else {
        await supabase.from("results").insert({
          fixture_id: editFixtureId,
          home_goals: h,
          away_goals: a,
        });
      }

      // OVDJE više ne radimo automatski recalculation!
      await loadFixtures();
      setRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
      setEditFixtureId(null);
    }
  };

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    await recalculateStandings(leagueCode);
    setRefreshKey((k) => k + 1);
    setRecalcLoading(false);
  };

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">Admin — Upravljanje rezultatima</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setLeagueCode("PIONIRI")}
          className={`px-4 py-2 rounded ${
            leagueCode === "PIONIRI" ? "bg-green-700 text-white" : "bg-gray-300"
          }`}
        >
          Pioniri
        </button>
        <button
          onClick={() => setLeagueCode("MLADJI")}
          className={`px-4 py-2 rounded ${
            leagueCode === "MLADJI" ? "bg-green-700 text-white" : "bg-gray-300"
          }`}
        >
          Mlađi pioniri
        </button>
      </div>

      {/* 🔥 GUMB ZA AŽURIRANJE TABLICE */}
      <div>
        <button
          onClick={handleRecalculate}
          disabled={recalcLoading}
          className="px-4 py-2 bg-green-700 text-white rounded shadow"
        >
          {recalcLoading ? "Ažuriram..." : "Ažuriraj tablicu"}
        </button>
      </div>

      <div className="border rounded p-4">
        <LeagueView leagueCode={leagueCode} refreshKey={refreshKey} />
      </div>

      <h2 className="text-xl font-semibold">Sve utakmice</h2>

      {loading ? (
        <p>Učitavanje...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b font-semibold">
              <th>Kolo</th>
              <th>Datum</th>
              <th>Vrijeme</th>
              <th>Domaćin</th>
              <th>Gost</th>
              <th>Rezultat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => (
              <tr key={f.id} className="border-b">
                <td>{f.round}</td>
                <td>
                  {f.match_date
                    ? new Date(f.match_date).toLocaleDateString("hr-HR")
                    : ""}
                </td>
                <td>{f.match_time}</td>
                <td>{f.home_team}</td>
                <td>{f.away_team}</td>
                <td>
                  {results[f.id]
                    ? `${results[f.id]!.home_goals}:${results[f.id]!.away_goals}`
                    : "—"}
                </td>
                <td>
                  <button
                    onClick={() => startEditing(f)}
                    className="px-3 py-1 text-white bg-green-700 rounded text-xs"
                  >
                    Uredi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editFixtureId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-72 space-y-4">
            <h3 className="text-lg font-bold">Unos rezultata</h3>

            <div className="flex items-center gap-3">
              <input
                type="number"
                className="border p-2 text-center w-16"
                value={homeGoals}
                onChange={(e) => setHomeGoals(e.target.value)}
              />
              <span className="font-bold">:</span>
              <input
                type="number"
                className="border p-2 text-center w-16"
                value={awayGoals}
                onChange={(e) => setAwayGoals(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-300 rounded"
                onClick={() => setEditFixtureId(null)}
                disabled={saving}
              >
                Odustani
              </button>
              <button
                className="px-3 py-1 bg-green-700 text-white rounded"
                onClick={saveResult}
                disabled={saving}
              >
                {saving ? "Spremanje..." : "Spremi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
