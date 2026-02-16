"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
      .select(`
        id,
        round,
        match_date,
        match_time,
        home:home_team_id ( name ),
        away:away_team_id ( name ),
        result:results!fixture_id ( home_goals, away_goals )
      `)
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
      home_goals: f.result?.home_goals ?? null,
      away_goals: f.result?.away_goals ?? null,
      datetime: f.match_date ? new Date(`${f.match_date}T${f.match_time}`) : null,
    }));

    setFixtures(parsed);

    const now = new Date();
    const future = parsed.filter((f) => f.datetime && f.datetime > now);
    const nr = future.length > 0 ? Math.min(...future.map((x) => x.round)) : null;

    setNextRound(nr);
    setLoading(false);
  }

  if (!authorized) {
    return (
      <form
        onSubmit={tryLogin}
        className="max-w-sm mx-auto mt-20 bg-white p-6 rounded-xl shadow border"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">Admin login</h1>

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Lozinka"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="w-full py-2 rounded-lg bg-[#f37c22] text-white shadow">
          Prijava
        </button>
      </form>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      
      <div className="flex items-center justify-between">
        <button
          onClick={() => (window.location.href = "/")}
          className="px-4 py-2 rounded-full bg-[#f7f1e6] border border-[#c8b59a] text-[#0A5E2A] shadow text-sm"
        >
          ← Početna
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-[#0A5E2A] text-center flex-1">
          Admin panel — Pregled rezultata
        </h1>

        <button
          onClick={() => (window.location.href = "/admin/izvjestaji")}
          className="px-4 py-2 rounded-full bg-[#0A5E2A] hover:bg-[#08471f] text-white shadow text-sm"
        >
          Izvještaji
        </button>
      </div>

      {/* GUMBI */}
      <div className="flex justify-center flex-wrap gap-4">
        <button
          onClick={() => (window.location.href = "/admin/live")}
          className="px-10 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow font-bold text-lg"
        >
          LIVE unos rezultata
        </button>

        <button
          onClick={() => (window.location.href = "/admin/fixtures")}
          className="px-6 py-3 rounded-full bg-[#f37c22] hover:bg-[#d96d1c] text-white shadow font-semibold"
        >
          🔧 Modifikacija susreta
        </button>

        <button
          onClick={() => (window.location.href = "/api/reports/final")}
          className="px-6 py-3 rounded-full bg-[#0A5E2A] hover:bg-[#08471f] text-white shadow font-semibold"
        >
          📄 FINAL DAY DOCX
        </button>
      </div>

      {/* ODABIR LIGE */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border text-center">
        <label className="font-semibold text-[#0A5E2A]">Odaberi ligu:</label>
        <select
          value={league}
          onChange={(e) => {
            const val = e.target.value as LeagueCode | "";
            setLeague(val);
            if (val) loadFixtures(val);
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
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setView("CURRENT")}
            className={`px-4 py-2 rounded-full border ${
              view === "CURRENT" ? "bg-[#0A5E2A] text-white" : "bg-[#f7f1e6] text-[#0A5E2A]"
            }`}
          >
            Aktualno kolo
          </button>

          <button
            onClick={() => setView("ALL")}
            className={`px-4 py-2 rounded-full border ${
              view === "ALL" ? "bg-[#0A5E2A] text-white" : "bg-[#f7f1e6] text-[#0A5E2A]"
            }`}
          >
            Sva kola
          </button>
        </div>
      )}

      {loading && <div className="text-center">Učitavanje…</div>}

      {/* ---------- CURRENT ROUND (READ-ONLY) ---------- */}
      {league && !loading && view === "CURRENT" && nextRound && (
        <div className="bg-[#f7f1e6] p-4 rounded-xl border">
          <h2 className="text-xl font-bold text-[#0A5E2A] mb-4 text-center">{nextRound}. kolo</h2>

          {fixtures.filter(f => f.round === nextRound).map(f => (
            <div key={f.id} className="flex justify-between items-center bg-white py-2 px-3 rounded-lg border mb-2">
              <div>
                <div className="font-semibold">{f.home_team} vs {f.away_team}</div>
                <div className="text-xs text-gray-500">
                  {new Date(f.match_date).toLocaleDateString("hr-HR")} • {f.match_time?.slice(0, 5)}
                </div>
              </div>

              <div className="font-bold text-lg text-[#0A5E2A] min-w-[50px] text-center">
                {f.home_goals !== null ? `${f.home_goals}:${f.away_goals}` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- ALL ROUNDS (READ-ONLY) ---------- */}
      {league && !loading && view === "ALL" && (
        <div className="space-y-6">
          {Object.keys(
            fixtures.reduce((acc: any, f) => {
              if (!acc[f.round]) acc[f.round] = [];
              acc[f.round].push(f);
              return acc;
            }, {})
          )
            .sort((a, b) => Number(a) - Number(b))
            .map(round => {
              const list = fixtures.filter(f => f.round === Number(round));
              return (
                <div key={round} className="rounded-xl border bg-[#f7f1e6] p-4">
                  <h2 className="text-xl font-bold text-[#0b5b2a] mb-3">{round}. kolo</h2>

                  <div className="space-y-2">
                    {list.map(f => (
                      <div key={f.id} className="flex justify-between items-center bg-white py-2 px-3 rounded-lg border">
                        <div>
                          <div className="font-semibold">{f.home_team} vs {f.away_team}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(f.match_date).toLocaleDateString("hr-HR")} • {f.match_time?.slice(0, 5)}
                          </div>
                        </div>

                        <div className="font-bold text-lg text-[#0A5E2A] min-w-[50px] text-center">
                          {f.home_goals !== null ? `${f.home_goals}:${f.away_goals}` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ---------- FOOTER ---------- */}
      <footer className="text-center pt-10 opacity-80 text-sm">
        <div className="mt-4">
          <a href="/admin/backup" className="text-gray-500 underline hover:text-gray-700">
            Backup
          </a>
        </div>
      </footer>
    </div>
  );
}
