"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LiveMatchesAuto() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // -------------------------
  // INITIAL LOAD → AUTO NEXT ROUND
  // -------------------------
  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);

    // 1) UČITAJ SVE FIXTURE DATUME
    const { data: allFixtures, error } = await supabase
      .from("fixtures")
      .select("match_date")
      .order("match_date");

    if (error || !allFixtures) {
      console.error(error);
      setLoading(false);
      return;
    }

    // 2) PRONADI PRVI BUDUCI DATUM
    const now = new Date();
    let nextDate = allFixtures
      .map((f) => f.match_date)
      .find((d) => new Date(d) >= now);

    // Ako bas nema buducih (teoretski), padne na zadnji
    if (!nextDate) {
      nextDate = allFixtures[allFixtures.length - 1]?.match_date;
    }

    setSelectedDate(nextDate);
    loadForDate(nextDate);
  }

  // -------------------------
  // LOAD FOR SELECTED DATE
  // -------------------------
  async function loadForDate(dateString: string) {
    setLoading(true);

    const { data: fixtures, error } = await supabase
      .from("fixtures")
      .select("id, match_time, home_team_id, away_team_id")
      .eq("match_date", dateString)
      .order("match_time");

    if (error) {
      console.error(error);
      setMatches([]);
      setLoading(false);
      return;
    }

    if (!fixtures || fixtures.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const teamIds = Array.from(
      new Set(fixtures.flatMap((f) => [f.home_team_id, f.away_team_id]))
    );

    const { data: teams } = await supabase
      .from("teams")
      .select("id,name")
      .in("id", teamIds);

    const teamMap: Record<number, string> = {};
    (teams || []).forEach((t) => (teamMap[t.id] = t.name));

    const parsed = fixtures.map((m) => ({
      id: m.id,
      match_time: m.match_time ? m.match_time.substring(0, 5) : "",
      home_team: teamMap[m.home_team_id] ?? "Nepoznato",
      away_team: teamMap[m.away_team_id] ?? "Nepoznato",
    }));

    setMatches(parsed);
    setLoading(false);
  }

  // Ako korisnik manuelno promijeni datum
  useEffect(() => {
    if (selectedDate) loadForDate(selectedDate);
  }, [selectedDate]);

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

      {/* DATUM SELECTOR */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a] flex items-center gap-4">
        <span className="font-semibold text-[#0A5E2A]">Datum:</span>

        <input
          type="date"
          value={selectedDate ?? ""}
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
            <div className="font-semibold text-[#0b5b2a]">
              {m.home_team} vs {m.away_team}
            </div>
            <div className="text-sm text-gray-600">{m.match_time}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
