"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type LiveMatchItem = {
  id: number;
  match_time: string;
  home_team: string;
  away_team: string;
  league_name: string;
  round: number;
};

const LEAGUE_LABELS: Record<string, string> = {
  PIONIRI_REG: "Pioniri",
  MLPIONIRI_REG: "Mlađi pioniri",
  PRSTICI_REG: "Prstići",
  POC_REG_A: "Početnici A",
  POC_REG_B: "Početnici B",
  POC_GOLD: "Početnici – Zlatna liga",
  POC_SILVER: "Početnici – Srebrna liga",
};

export default function LiveMatchesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [matches, setMatches] = useState<LiveMatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForDate(selectedDate);
  }, [selectedDate]);

  async function loadForDate(dateString: string) {
    setLoading(true);

    // 1) Dohvati sve fixture-e za taj datum
    const { data: fixtures, error } = await supabase
      .from("fixtures")
      .select(
        "id, league_code, round, match_time, home_team_id, away_team_id"
      )
      .eq("match_date", dateString)
      .order("match_time", { ascending: true });

    if (error) {
      console.error("Fixtures error:", error);
      setMatches([]);
      setLoading(false);
      return;
    }

    if (!fixtures || fixtures.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    // 2) Učitaj sve potrebne timove
    const teamIds = Array.from(
      new Set(
        fixtures.flatMap((f) => [f.home_team_id as number, f.away_team_id as number])
      )
    );

    const { data: teams, error: teamsErr } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamsErr) {
      console.error("Teams error:", teamsErr);
    }

    const teamMap: Record<number, string> = {};
    (teams || []).forEach((t) => {
      teamMap[Number(t.id)] = t.name;
    });

    // 3) Posloži podatke za prikaz
    const parsed: LiveMatchItem[] = (fixtures || []).map((m: any) => ({
      id: Number(m.id),
      match_time: m.match_time ? m.match_time.substring(0, 5) : "",
      home_team: teamMap[Number(m.home_team_id)] ?? "Nepoznato",
      away_team: teamMap[Number(m.away_team_id)] ?? "Nepoznato",
      league_name: LEAGUE_LABELS[m.league_code] ?? m.league_code,
      round: m.round,
    }));

    setMatches(parsed);
    setLoading(false);
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#0A5E2A]">
          Live unos — utakmice
        </h1>

        <button
          className="px-4 py-2 bg-[#f7f1e6] border border-[#c8b59a] rounded-full text-[#0A5E2A] shadow"
          onClick={() => (window.location.href = "/admin")}
        >
          ← Natrag
        </button>
      </div>

      {/* Datum */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a] flex items-center gap-4">
        <span className="font-semibold text-[#0A5E2A]">Datum:</span>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      {loading && <div>Učitavanje...</div>}

      {!loading && matches.length === 0 && (
        <div className="bg-white p-4 rounded-xl border text-center text-gray-600">
          Nema utakmica za odabrani datum.
        </div>
      )}

      <div className="space-y-3">
        {matches.map((m) => (
          <Link
            key={m.id}
            href={`/admin/live/${m.id}`}
            className="block bg-white p-4 rounded-xl border border-[#e2d5bd] shadow hover:bg-[#f7f1e6] transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#0b5b2a]">
                  {m.home_team} vs {m.away_team}
                </div>
                <div className="text-sm text-gray-600">{m.match_time}</div>
              </div>
              <div className="text-xs text-right text-gray-600">
                <div>{m.league_name}</div>
                <div>{m.round}. kolo</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
