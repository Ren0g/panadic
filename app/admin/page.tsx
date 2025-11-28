"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { recalculateStandings } from "@/lib/recalculateStandings";

type LeagueCode =
  | "PIONIRI"
  | "MLADJI"
  | "PRSTICI"
  | "POC_A"
  | "POC_B"
  | "POC_GOLD"
  | "POC_SILVER";

const LEAGUE_DB_CODE: Record<LeagueCode, string> = {
  PIONIRI: "PIONIRI_REG",
  MLADJI: "MLPIONIRI_REG",
  PRSTICI: "PRSTICI_REG",
  POC_A: "POC_REG_A",
  POC_B: "POC_REG_B",
  POC_GOLD: "POC_GOLD",
  POC_SILVER: "POC_SILVER",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [league, setLeague] = useState<LeagueCode | "">("");
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadFixtures(code: LeagueCode) {
    setLoading(true);
    const leagueCode = LEAGUE_DB_CODE[code];

    const { data } = await supabase
      .from("fixtures")
      .select(
        `
        id,
        round,
        match_date,
        match_time,
        home:home_team_id ( name ),
        away:away_team_id ( name ),
        results:results ( home_goals, away_goals )
      `
      )
      .eq("league_code", leagueCode)
      .order("round")
      .order("match_date");

    const parsed = (data || []).map((f: any) => ({
      id: f.id,
      round: f.round,
      match_date: f.match_date,
      match_time: f.match_time,
      home_team: f.home?.name ?? "",
      away_team: f.away?.name ?? "",
      home_goals: f.results?.[0]?.home_goals ?? "",
      away_goals: f.results?.[0]?.away_goals ?? "",
    }));

    setFixtures(parsed);
    setLoading(false);
  }

  async function saveResult(fixtureId: number, home: any, away: any) {
    const hg = home === "" ? null : Number(home);
    const ag = away === "" ? null : Number(away);

    const { data: existing } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId)
      .single();

    if (existing) {
      await supabase
        .from("results")
        .update({ home_goals: hg, away_goals: ag })
        .eq("fixture_id", fixtureId);
    } else {
      await supabase
        .from("results")
        .insert({ fixture_id: fixtureId, home_goals: hg, away_goals: ag });
    }

    if (league) {
      await recalculateStandings(LEAGUE_DB_CODE[league] as any);
    }

    if (league) loadFixtures(league);
  }

  async function deleteResult(fixtureId: number) {
    await supabase.from("results").delete().eq("fixture_id", fixtureId);

    if (league) {
      await recalculateStandings(LEAGUE_DB_CODE[league] as any);
    }

    if (league) loadFixtures(league);
  }

  function tryLogin() {
    if (password === "panadic2025") setAuthorized(true);
    else alert("Pogrešna lozinka");
  }

  if (!authorized) {
    return (
      <div className="max-w-sm mx-auto mt-20 bg-white p-6 rounded-xl shadow border border-gray-300">
        <h1 className="text-xl font-semibold mb-4 text-center">Admin login</h1>

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Lozinka"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={tryLogin}
          className="w-full bg-[#0A5E2A] text-white py-2 rounded-lg"
        >
          Prijava
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-[#0A5E2A] mb-4">
        Admin panel — Unos rezultata
      </h1>

      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a]">
        <label className="font-semibold text-[#0A5E2A]">Odaberi ligu:</label>

        <select
          value={league}
          onChange={(e) => {
            const val = e.target.value as LeagueCode | "";
            setLeague(val);
            if (val !== "") loadFixtures(val);
          }}
          className="ml-4 px-3 py-2 border rounded-lg"
        >
          <option value="">— odaberi —</option>
          <option value="PIONIRI">Pioniri</option>
          <option value="MLADJI">Mlađi pioniri</option>
          <option value="PRSTICI">Prstići</option>
          <option value="POC_A">Početnici A</option>
          <option value="POC_B">Početnici B</option>
          <option value="POC_GOLD">Zlatna liga</option>
          <option value="POC_SILVER">Srebrna liga</option>
        </select>
      </div>

      {league && (
        <div className="space-y-6">
          {loading ? (
            <div>Učitavanje...</div>
          ) : (
            fixtures.map((fx) => (
              <div
                key={fx.id}
                className="bg-white p-4 rounded-xl border border-[#e2d5bd] shadow"
              >
                <div className="font-semibold text-[#0b5b2a] mb-2">
                  {fx.round}. kolo — {fx.home_team} vs {fx.away_team}
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  {fx.match_date} u {fx.match_time?.substring(0, 5)}
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    value={fx.home_goals}
                    onChange={(e) => {
                      fx.home_goals = e.target.value;
                      setFixtures([...fixtures]);
                    }}
                    className="w-16 text-center border rounded px-2 py-1"
                  />

                  <span className="font-bold text-lg">:</span>

                  <input
                    type="number"
                    min="0"
                    value={fx.away_goals}
                    onChange={(e) => {
                      fx.away_goals = e.target.value;
                      setFixtures([...fixtures]);
                    }}
                    className="w-16 text-center border rounded px-2 py-1"
                  />

                  <button
                    onClick={() =>
                      saveResult(fx.id, fx.home_goals, fx.away_goals)
                    }
                    className="px-4 py-2 bg-[#0A5E2A] text-white rounded-lg"
                  >
                    Spremi
                  </button>

                  {fx.home_goals !== "" && fx.away_goals !== "" && (
                    <button
                      onClick={() => deleteResult(fx.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg"
                    >
                      Obriši
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
