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

  const [view, setView] = useState<"CURRENT" | "ALL">("CURRENT");

  const [league, setLeague] = useState<LeagueCode | "">("");
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [nextRound, setNextRound] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);

  function tryLogin() {
    if (password === "panadic2025") setAuthorized(true);
    else alert("Pogrešna lozinka");
  }

  async function loadFixtures(code: LeagueCode) {
    setLoading(true);

    const dbCode = LEAGUE_DB_CODE[code];

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
      .eq("league_code", dbCode)
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
      datetime: f.match_date ? new Date(`${f.match_date}T${f.match_time}`) : null
    }));

    setFixtures(parsed);

    // izračun aktualnog kola
    const now = new Date();
    const future = parsed.filter((f) => f.datetime && f.datetime > now);
    const nr = future.length > 0 ? Math.min(...future.map((x) => x.round)) : null;
    setNextRound(nr);

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

    if (league) await recalculateStandings(LEAGUE_DB_CODE[league] as any);
    if (league) loadFixtures(league);
  }

  async function deleteResult(fixtureId: number) {
    const yes = confirm("Jeste li sigurni da želite obrisati rezultat?");
    if (!yes) return;

    await supabase.from("results").delete().eq("fixture_id", fixtureId);

    if (league) await recalculateStandings(LEAGUE_DB_CODE[league] as any);
    if (league) loadFixtures(league);
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
      {/* HEADER SA GUMBOM NA POCETNU */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0A5E2A]">
          Admin panel — Unos rezultata
        </h1>

        <button
          className="px-4 py-2 bg-[#f7f1e6] border border-[#c8b59a] rounded-full text-[#0A5E2A] shadow"
          onClick={() => (window.location.href = "/")}
        >
          ← Povratak na početnu
        </button>
      </div>

      {/* IZBOR LIGE */}
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

      {/* PREBACIVANJE IZMEĐU POGLEDA */}
      {league && (
        <div className="flex gap-4">
          <button
            onClick={() => setView("CURRENT")}
            className={`px-4 py-2 rounded-full border ${
              view === "CURRENT"
                ? "bg-[#0A5E2A] text-white"
                : "bg-[#f7f1e6] text-[#0A5E2A] border-[#c8b59a]"
            }`}
          >
            Aktualno kolo
          </button>

          <button
            onClick={() => setView("ALL")}
            className={`px-4 py-2 rounded-full border ${
              view === "ALL"
                ? "bg-[#0A5E2A] text-white"
                : "bg-[#f7f1e6] text-[#0A5E2A] border-[#c8b59a]"
            }`}
          >
            Sva kola (pregled + edit)
          </button>
        </div>
      )}

      {/* SADRŽAJ */}
      {loading && <div>Učitavanje...</div>}

      {league && !loading && (
        <>
          {/* ➤ PRIKAZ SAMO AKTUALNOG KOLA */}
          {view === "CURRENT" && nextRound && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#0A5E2A]">
                {nextRound}. kolo
              </h2>

              {fixtures
                .filter((fx) => fx.round === nextRound)
                .map((fx) => (
                  <div
                    key={fx.id}
                    className="bg-white p-4 rounded-xl border border-[#e2d5bd] shadow"
                  >
                    <div className="font-semibold text-[#0b5b2a] mb-2">
                      {fx.home_team} vs {fx.away_team}
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      {fx.match_date} u {fx.match_time.substring(0, 5)}
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

                      {(fx.home_goals !== "" || fx.away_goals !== "") && (
                        <button
                          onClick={() => deleteResult(fx.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg"
                        >
                          Obriši
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ➤ PRIKAZ SVIH KOLA */}
          {view === "ALL" && (
            <div className="space-y-8">
              {Object.keys(
                fixtures.reduce((acc: any, fx) => {
                  if (!acc[fx.round]) acc[fx.round] = [];
                  acc[fx.round].push(fx);
                  return acc;
                }, {})
              )
                .sort((a, b) => Number(a) - Number(b))
                .map((round) => (
                  <div
                    key={round}
                    className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a]"
                  >
                    <h2 className="text-xl font-bold text-[#0A5E2A] mb-3">
                      {round}. kolo
                    </h2>

                    {(fixtures || [])
                      .filter((f) => f.round == Number(round))
                      .map((fx) => (
                        <div
                          key={fx.id}
                          className="bg-white p-4 mb-3 rounded-lg border border-[#e2d5bd] shadow"
                        >
                          <div className="font-semibold text-[#0b5b2a] mb-2">
                            {fx.home_team} vs {fx.away_team}
                          </div>

                          <div className="text-sm text-gray-600 mb-3">
                            {fx.match_date} u {fx.match_time.substring(0, 5)}
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

                            {(fx.home_goals !== "" || fx.away_goals !== "") && (
                              <button
                                onClick={() => deleteResult(fx.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg"
                              >
                                Obriši
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
