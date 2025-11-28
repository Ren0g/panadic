"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LiveMatchesToday() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // defaultni datum = danas
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    loadForDate(selectedDate);
  }, [selectedDate]);

  async function loadForDate(dateString: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("fixtures")
      .select(`
        id,
        round,
        league_code,
        match_date,
        match_time,
        home:home_team_id ( name ),
        away:away_team_id ( name )
      `)
      .eq("match_date", dateString)
      .order("match_time");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const parsed = (data || []).map((m: any) => ({
      id: m.id,
      match_time: m.match_time ? m.match_time.substring(0, 5) : "",
      home_team: Array.isArray(m.home) ? m.home[0]?.name : m.home?.name,
      away_team: Array.isArray(m.away) ? m.away[0]?.name : m.away?.name,
      league_code: m.league_code,
    }));

    setMatches(parsed);
    setLoading(false);
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">

      {/* HEADER */}
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

      {/* DATE PICKER */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a] flex items-center gap-4">
        <span className="font-semibold text-[#0A5E2A]">Datum:</span>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      {/* UTKAMICE */}
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
