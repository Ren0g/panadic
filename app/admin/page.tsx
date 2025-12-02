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
        result:results!fixture_id ( home_goals, away_goals )
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
      home_goals: f.result?.home_goals ?? "",
      away_goals: f.result?.away_goals ?? "",
      datetime: f.match_date
        ? new Date(`${f.match_date}T${f.match_time}`)
        : null,
    }));

    setFixtures(parsed);

    const now = new Date();
    const future = parsed.filter((f) => f.datetime && f.datetime > now);
    const nr =
      future.length > 0 ? Math.min(...future.map((x) => x.round)) : null;
    setNextRound(nr);

    setLoading(false);
  }

  async function saveResult(
    fixtureId: number,
    home: any,
    away: any
  ) {
    const hg = home === "" ? null : Number(home);
    const ag = away === "" ? null : Number(away);

    const { data: existing } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("results")
        .update({ home_goals: hg, away_goals: ag })
        .eq("fixture_id", fixtureId);
    } else {
      await supabase
        .from("results")
        .insert({
          fixture_id: fixtureId,
          home_goals: hg,
          away_goals: ag,
        });
    }

    await recalculateStandingsForFixture(fixtureId);

    if (league) loadFixtures(league);
  }

  async function deleteResult(fixtureId: number) {
    if (!confirm("Jeste li sigurni da želite obrisati rezultat?")) return;

    await supabase.from("results").delete().eq("fixture_id", fixtureId);
    await recalculateStandingsForFixture(fixtureId);

    if (league) loadFixtures(league);
  }

  // ---------------- LOGIN ----------------
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

  // -------------- MAIN ADMIN PANEL --------------
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

      {loading && <div>Učitavanje...</div>}
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
        result:results!fixture_id ( home_goals, away_goals )
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
      home_goals: f.result?.home_goals ?? "",
      away_goals: f.result?.away_goals ?? "",
      datetime: f.match_date
        ? new Date(`${f.match_date}T${f.match_time}`)
        : null,
    }));

    setFixtures(parsed);

    const now = new Date();
    const future = parsed.filter((f) => f.datetime && f.datetime > now);
    const nr =
      future.length > 0 ? Math.min(...future.map((x) => x.round)) : null;
    setNextRound(nr);

    setLoading(false);
  }

  async function saveResult(
    fixtureId: number,
    home: any,
    away: any
  ) {
    const hg = home === "" ? null : Number(home);
    const ag = away === "" ? null : Number(away);

    const { data: existing } = await supabase
      .from("results")
      .select("*")
      .eq("fixture_id", fixtureId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("results")
        .update({ home_goals: hg, away_goals: ag })
        .eq("fixture_id", fixtureId);
    } else {
      await supabase
        .from("results")
        .insert({
          fixture_id: fixtureId,
          home_goals: hg,
          away_goals: ag,
        });
    }

    await recalculateStandingsForFixture(fixtureId);

    if (league) loadFixtures(league);
  }

  async function deleteResult(fixtureId: number) {
    if (!confirm("Jeste li sigurni da želite obrisati rezultat?")) return;

    await supabase.from("results").delete().eq("fixture_id", fixtureId);
    await recalculateStandingsForFixture(fixtureId);

    if (league) loadFixtures(league);
  }

  // ---------------- LOGIN ----------------
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

  // -------------- MAIN ADMIN PANEL --------------
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

      {loading && <div>Učitavanje...</div>}
