"use client";

import { useEffect, useState } from "react";

type Report = {
  id: number;
  season: string;
  round: number;
  created_at: string;
};

type GroupedReports = {
  [season: string]: Report[];
};

const MAX_ROUNDS = 11;

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number>(1);

  // ---- LOAD REPORTS ----
  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Greška pri dohvaćanju arhive izvještaja");
      }
      const data = (await res.json()) as Report[];
      setReports(data);
    } catch (err: any) {
      setError(err.message || "Greška pri učitavanju podataka");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // ---- GENERATE NEW REPORT ----
  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round: selectedRound }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Greška pri generiranju izvještaja");
      }

      const data = await res.json();

      // otvori novi tab s HTML-om koji odmah ide na print
      if (data?.id) {
        window.open(`/api/reports/${data.id}?print=1`, "_blank");
      }

      // osvježi listu
      await loadReports();
    } catch (err: any) {
      setError(err.message || "Greška pri generiranju izvještaja");
    } finally {
      setGenerating(false);
    }
  }

  // ---- DELETE REPORT ----
  async function handleDelete(id: number) {
    const yes = confirm("Jeste li sigurni da želite obrisati ovaj izvještaj?");
    if (!yes) return;

    try {
      const res = await fetch(`/api/reports?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Greška pri brisanju izvještaja");
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || "Greška pri brisanju izvještaja");
    }
  }

  // ---- GROUP BY SEASON ----
  const grouped: GroupedReports = reports.reduce((acc, r) => {
    if (!acc[r.season]) acc[r.season] = [];
    acc[r.season].push(r);
    return acc;
  }, {} as GroupedReports);

  const seasons = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy}. u ${hh}:${min}`;
  }

  function buildFileName(r: Report) {
    const d = new Date(r.created_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `izvjestaj_kolo_${r.round}_${yyyy}-${mm}-${dd}_${hh}-${min}.html`;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A5E2A]">
            Arhiva izvještaja — sezona 2025/26
          </h1>
          <p className="text-sm text-gray-600">
            Pregled svih automatski generiranih izvještaja po kolima.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          <button
            onClick={() => (window.location.href = "/admin")}
            className="px-4 py-2 rounded-full cursor-pointer bg-[#f7f1e6] border border-[#c8b59a] text-[#0A5E2A] shadow text-sm text-center"
          >
            ← Natrag na Admin panel
          </button>

          <div className="flex items-center gap-3">
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="px-3 py-2 rounded-full border border-[#c8b59a] bg-white text-sm"
            >
              {Array.from({ length: MAX_ROUNDS }).map((_, i) => {
                const r = i + 1;
                return (
                  <option key={r} value={r}>
                    {r}. kolo
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-5 py-2 text-white rounded-full cursor-pointer bg-[#0A5E2A] hover:bg-[#08471f] shadow text-sm disabled:opacity-60"
            >
              {generating ? "Generiram..." : "Generiraj izvještaj"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && <div>Učitavanje arhive...</div>}

      {/* SEASONS + LISTA */}
      {!loading && seasons.length === 0 && (
        <div className="text-sm text-gray-600">
          Još nema nijednog spremljenog izvještaja u arhivi.
        </div>
      )}

      {!loading &&
        seasons.map((season) => {
          const reps = grouped[season].slice().sort((a, b) => {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          });

          return (
            <div
              key={season}
              className="bg-[#f7f1e6] border border-[#c8b59a] rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0A5E2A]">
                  Sezona {season}
                </h2>
              </div>

              <div className="space-y-4">
                {reps.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white rounded-lg border border-[#e2d5bd] shadow px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#0A5E2A]" />
                      <div>
                        <div className="font-medium text-sm text-[#0A5E2A]">
                          {r.round}. kolo
                        </div>
                        <div className="text-xs text-gray-600">
                          Generirano: {formatDateTime(r.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        onClick={() =>
                          window.open(`/api/reports/${r.id}?print=1`, "_blank")
                        }
                        className="px-3 py-1 rounded-full border border-[#c8b59a] bg-[#f7f1e6] text-[#0A5E2A] cursor-pointer"
                      >
                        Otvori / PDF
                      </button>

                      <a
                        href={`/api/reports/${r.id}?print=0`}
                        target="_blank"
                        rel="noreferrer"
                        download={buildFileName(r)}
                        className="px-3 py-1 rounded-full border border-[#c8b59a] bg-white text-[#0A5E2A] cursor-pointer"
                      >
                        Preuzmi HTML
                      </a>

                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
