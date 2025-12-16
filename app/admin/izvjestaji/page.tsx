"use client";

import { useEffect, useState } from "react";

type Report = {
  id: number;
  season: string;
  round: number;
  league: string;
  created_at: string;
};

const LEAGUE_LABEL: Record<string, string> = {
  PIONIRI_REG: "Pioniri",
  MLPIONIRI_REG: "Mlađi pioniri",
  PRSTICI_REG: "Prstići",
  POC_REG_A: "Početnici A",
  POC_REG_B: "Početnici B",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [round, setRound] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------- LOAD REPORTS ----------------
  async function loadReports() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (!res.ok) throw new Error("Ne mogu dohvatiti arhivu.");

      const data = await res.json();
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // ---------------- GENERATE ----------------
  async function generateReport() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/generate?round=${round}`, {
        method: "POST",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      // NE očekujemo ID više
      await loadReports();
    } catch (err: any) {
      setError(err.message || "Greška pri generiranju izvještaja.");
    } finally {
      setGenerating(false);
    }
  }

  // ---------------- DELETE ----------------
  async function deleteReport(id: number) {
    if (!confirm("Obriši izvještaj?")) return;

    const res = await fetch(`/api/reports?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    } else {
      alert("Greška pri brisanju.");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("hr-HR");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      <h1 className="text-3xl font-bold text-[#0A5E2A] mb-1">
        Izvještaji — sezona 2025/26
      </h1>
      <p className="text-gray-600 mb-8">
        Jedna liga = jedan Word dokument.
      </p>

      {/* TOOLS */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <button
          onClick={() => (window.location.href = "/admin")}
          className="px-4 py-2 rounded-full bg-[#f7f1e6] border border-[#c8b59a]
                     text-[#0A5E2A] shadow"
        >
          ← Natrag na Admin panel
        </button>

        <select
          value={round}
          onChange={(e) => setRound(Number(e.target.value))}
          className="px-3 py-2 rounded-full border border-[#c8b59a] bg-white shadow"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}. kolo
            </option>
          ))}
        </select>

        <button
          onClick={generateReport}
          disabled={generating}
          className="px-6 py-3 rounded-full bg-[#0A5E2A] text-white shadow
                     hover:bg-[#08471f] disabled:opacity-60"
        >
          {generating ? "Generiram…" : "📄 Generiraj izvještaje"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && <div>Učitavanje…</div>}

      {!loading && reports.length === 0 && (
        <div className="text-gray-600">Još nema izvještaja.</div>
      )}

      {/* LIST */}
      {reports.length > 0 && (
        <div className="bg-[#f7f1e6] border border-[#c8b59a] rounded-xl p-5 space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between bg-white
                         px-4 py-3 rounded-lg border shadow"
            >
              <div>
                <div className="font-semibold text-[#0A5E2A] text-sm">
                  {r.round}. kolo — {LEAGUE_LABEL[r.league] || r.league}
                </div>
                <div className="text-xs text-gray-600">
                  Generirano: {formatDate(r.created_at)}
                </div>
              </div>

              <div className="flex gap-2 text-xs">
                <a
                  href={`/api/reports/${r.id}?word=1`}
                  className="px-3 py-1 rounded-full border
                             bg-white text-[#0A5E2A]"
                >
                  Preuzmi Word
                </a>

                <button
                  onClick={() => deleteReport(r.id)}
                  className="px-3 py-1 rounded-full bg-red-600 text-white"
                >
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
