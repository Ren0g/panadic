"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { recalculateStandingsForFixture } from "@/lib/recalculateStandings";

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

  function tryLogin(e: any) {
    e.preventDefault();
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
      home_team: Array.isArray(f.home) ? f.home[0]?.name : f.home?.name,
      away_team: Array.isArray(f.away) ? f.away[0]?.name : f.away?.name,
      home_goals: f.results?.[0]?.home_goals ?? "",
      away_goals: f.results?.[0]?.away_goals ?? "",
      datetime: f.match_date ? new Date(`${f.match_date}T${f.match_time}`) : null,
    }));

    setFixtures(parsed);

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

    await recalculateStandingsForFixture(fixtureId);

    if (league) loadFixtures(league);
  }

  async function deleteResult(fixtureId: number) {
    const yes = confirm("Jeste li sigurni da želite obrisati rezultat?");
    if (!yes) return;

    await supabase.from("results").delete().eq("fixture_id", fixtureId);
    await recalculateStandingsForFixture(fixtureId);

    if (league) loadFixtures(league);
  }

  // LOGIN SCREEN
  if (!authorized) {
    return (
      <form
        onSubmit={tryLogin}
        className="max-w-sm mx-auto mt-20 bg-white p-6 rounded-xl shadow border border-gray-300"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">Admin login</h1>

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Lozinka"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full py-2 rounded-lg text-white cursor-pointer bg-[#f37c22] hover:bg-[#d96d1c] shadow"
        >
          Prijava
        </button>
      </form>
    );
  }

  // MAIN ADMIN PANEL
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#0A5E2A]">
          Admin panel — Unos rezultata
        </h1>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => (window.location.href = "/admin/live")}
            className="px-4 py-2 rounded-full text-white cursor-pointer bg-red-600 hover:bg-red-700 shadow"
          >
            LIVE unos rezultata
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 rounded-full cursor-pointer bg-[#f7f1e6] border border-[#c8b59a] text-[#0A5E2A] shadow"
          >
            ← Povratak na početnu
          </button>
        </div>
      </div>

      {/* -------- SELECT LIGE -------- */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a] text-center">
        <label className="font-semibold text-[#0A5E2A]">Odaberi ligu:</label>

        <select
          value={league}
          onChange={(e) => {
            const val = e.target.value as LeagueCode | "";
            setLeague(val);
            if (val !== "") loadFixtures(val);
          }}
          className="ml-4 px-3 py-2 border rounded-lg cursor-pointer"
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

      {/* -------- VIEW SWITCH -------- */}
      {league && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setView("CURRENT")}
            className={`px-4 py-2 rounded-full border cursor-pointer ${
              view === "CURRENT"
                ? "bg-[#0A5E2A] text-white"
                : "bg-[#f7f1e6] text-[#0A5E2A] border-[#c8b59a]"
            }`}
          >
            Aktualno kolo
          </button>

          <button
            onClick={() => setView("ALL")}
            className={`px-4 py-2 rounded-full border cursor-pointer ${
              view === "ALL"
                ? "bg-[#0A5E2A] text-white"
                : "bg-[#f7f1e6] text-[#0A5E2A] border-[#c8b59a]"
            }`}
          >
            Sva kola (pregled + edit)
          </button>
        </div>
      )}

      {/* -------- LOADING -------- */}
      {loading && <div>Učitavanje...</div>}

      {/* -------- VIEW FIXTURES -------- */}
      {league && !loading && (
        <>
          {view === "CURRENT" && nextRound && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#0A5E2A] text-center">
                {nextRound}. kolo
              </h2>

              {fixtures
                .filter((fx) => fx.round === nextRound)
                .map((fx) => (
                  <div
                    key={fx.id}
                    className="bg-white p-4 rounded-xl border border-[#e2d5bd] shadow"
                  >
                    <div className="font-semibold text-[#0b5b2a] mb-2 text-center">
                      {fx.home_team} vs {fx.away_team}
                    </div>

                    <div className="text-sm text-gray-600 mb-3 text-center">
                      {fx.match_date} u {fx.match_time.substring(0, 5)}
                    </div>

                    <div className="flex items-center gap-4 justify-center">
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
                        className="px-4 py-2 text-white rounded-lg cursor-pointer bg-[#f37c22] hover:bg-[#d96d1c]"
                      >
                        Spremi
                      </button>

                      {(fx.home_goals !== "" || fx.away_goals !== "") && (
                        <button
                          onClick={() => deleteResult(fx.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
                        >
                          Obriši
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

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
                    <h2 className="text-xl font-bold text-[#0A5E2A] mb-3 text-center">
                      {round}. kolo
                    </h2>

                    {fixtures
                      .filter((f) => f.round == Number(round))
                      .map((fx) => (
                        <div
                          key={fx.id}
                          className="bg-white p-4 mb-3 rounded-lg border border-[#e2d5bd] shadow"
                        >
                          <div className="font-semibold text-[#0b5b2a] mb-2 text-center">
                            {fx.home_team} vs {fx.away_team}
                          </div>

                          <div className="text-sm text-gray-600 mb-3 text-center">
                            {fx.match_date} u {fx.match_time.substring(0, 5)}
                          </div>

                          <div className="flex items-center gap-4 justify-center">
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
                              className="px-4 py-2 bg-[#f37c22] hover:bg-[#d96d1c] text-white rounded-lg cursor-pointer"
                            >
                              Spremi
                            </button>

                            {(fx.home_goals !== "" || fx.away_goals !== "") && (
                              <button
                                onClick={() => deleteResult(fx.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
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

      {/* -------- IZVJEŠTAJ GUMB -------- */}
      <div className="flex justify-end mt-10">
        <button
          onClick={() => {
            window.open("/api/report", "_blank");
          }}
          className="px-4 py-2 text-white rounded-full cursor-pointer bg-[#0A5E2A] hover:bg-[#08471f] shadow mr-4"
        >
          📄 Otvori izvještaj (HTML / PDF)
        </button>

        <button
          onClick={() => (window.location.href = "/admin/backup")}
          className="px-4 py-2 text-white rounded-full cursor-pointer bg-[#f37c22] hover:bg-[#d96d1c] shadow"
        >
          🟧 Napredno: Backup sustav
        </button>
      </div>
    </div>
  );
}
