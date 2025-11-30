"use client";

import { useEffect, useState } from "react";

type BackupMeta = {
  name: string;
  createdAt: string;
  size?: number;
};

type AuditRow = {
  id: number;
  table_name: string;
  action: string;
  row_id: number | null;
  changed_at: string;
};

const BACKUP_PASSWORD = "Jan 1 Franko";

export default function BackupPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ▼ AUDIT LOG STATE
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditVisible, setAuditVisible] = useState(false);

  // ---------------------------------
  // LOGIN HANDLING
  // ---------------------------------
  function tryLogin(e: any) {
    e.preventDefault();
    if (password === BACKUP_PASSWORD) {
      setAuthorized(true);
      setError(null);
    } else {
      setError("Pogrešna lozinka.");
    }
  }

  // ---------------------------------
  // BACKUP LIST LOADING
  // ---------------------------------
  async function loadBackups() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backup/list");
      if (!res.ok) throw new Error("Ne mogu učitati popis backupova.");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (e: any) {
      setError(e.message || "Greška pri učitavanju backupova.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authorized) loadBackups();
  }, [authorized]);

  // ---------------------------------
  // CREATE BACKUP
  // ---------------------------------
  async function handleCreateBackup() {
    const yes = confirm("Sigurno želiš napraviti novi backup svih liga?");
    if (!yes) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/backup/create", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Greška pri izradi backupa.");
      }

      await loadBackups();
      alert("Backup je uspješno napravljen.");
    } catch (e: any) {
      setError(e.message || "Greška pri izradi backupa.");
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------
  // RESTORE
  // ---------------------------------
  async function handleRestore(backupName: string) {
    const confirmFirst = confirm(
      `Želiš vratiti ligu(e) na stanje iz backupa:\n${backupName}?\n\nOva akcija će prebrisati postojeće podatke.`
    );
    if (!confirmFirst) return;

    const modeRaw = prompt(
      "Upiši:\n- SVE  → za restore svih liga\n- ili šifru lige (npr. MLPIONIRI_REG) za restore samo te lige"
    );

    if (!modeRaw) return;

    const modeTrimmed = modeRaw.trim().toUpperCase();
    const payload: any = { backupName };

    if (modeTrimmed === "SVE") payload.mode = "ALL";
    else {
      payload.mode = "ONE_LEAGUE";
      payload.leagueCode = modeTrimmed;
    }

    setRestoring(backupName);
    setError(null);

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Greška pri restore operaciji.");

      alert(
        `Restore gotov.\nNačin: ${
          payload.mode === "ALL" ? "sve lige" : `liga ${payload.leagueCode}`
        }`
      );
    } catch (e: any) {
      setError(e.message || "Greška pri restore operaciji.");
    } finally {
      setRestoring(null);
    }
  }

  // ---------------------------------
  // DELETE BACKUP
  // ---------------------------------
  async function handleDelete(backupName: string) {
    const yes = confirm(
      `Stvarno želiš obrisati backup:\n${backupName}?\n\nOva radnja je trajna.`
    );
    if (!yes) return;

    setError(null);

    try {
      const res = await fetch("/api/backup/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupName }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Greška pri brisanju backupa.");

      await loadBackups();
    } catch (e: any) {
      setError(e.message || "Greška pri brisanju backupa.");
    }
  }

  // ---------------------------------
  // DOWNLOAD
  // ---------------------------------
  function handleDownload(backupName: string) {
    window.location.href =
      "/api/backup/download?name=" + encodeURIComponent(backupName);
  }

  // ---------------------------------
  // LOAD AUDIT LOG
  // ---------------------------------
  async function loadAudit() {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/audit/list");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Greška pri učitavanju audit loga");

      setAudit(data.logs || []);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAuditLoading(false);
    }
  }

  function toggleAudit() {
    if (!auditVisible) loadAudit();
    setAuditVisible(!auditVisible);
  }

  // ---------------------------------
  // LOGIN SCREEN
  // ---------------------------------
  if (!authorized) {
    return (
      <form
        onSubmit={tryLogin}
        className="max-w-sm mx-auto mt-20 bg-white p-6 rounded-xl shadow border border-gray-300"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">Backup login</h1>

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Lozinka"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="text-red-600 text-sm mb-3 text-center">{error}</div>
        )}

        <button
          type="submit"
          className="w-full py-2 rounded-lg text-white cursor-pointer bg-[#f37c22] hover:bg-[#d96d1c] shadow"
        >
          Prijava
        </button>
      </form>
    );
  }

  // ---------------------------------
  // BACKUP PANEL
  // ---------------------------------
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0A5E2A]">
          Backup & Restore — Liga Panadić
        </h1>

        <button
          onClick={() => (window.location.href = "/admin")}
          className="px-4 py-2 rounded-full cursor-pointer bg-[#f7f1e6] border border-[#c8b59a] text-[#0A5E2A] shadow"
        >
          ← Natrag na admin
        </button>
      </div>

      {/* BACKUP INFO BOX */}
      <div className="bg-[#f7f1e6] p-4 rounded-xl border border-[#c8b59a] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="font-semibold text-[#0A5E2A]">Trenutno stanje:</div>
          <div className="text-sm text-gray-700">
            Backup i restore svih liga (teams, fixtures, results, standings).
          </div>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="px-4 py-2 bg-[#f37c22] hover:bg-[#d96d1c] text-white rounded-full shadow cursor-pointer disabled:opacity-50"
        >
          {creating ? "Izrada backupa..." : "Napravi novi backup"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* BACKUP LIST */}
      <div className="bg-white rounded-xl border border-[#d9cbb1] shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#0A5E2A]">
            Pohranjeni backupovi
          </h2>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="text-sm underline cursor-pointer"
          >
            {loading ? "Osvježavam..." : "Osvježi popis"}
          </button>
        </div>

        {backups.length === 0 && (
          <div className="text-sm text-gray-600">
            Trenutno nema spremljenih backupova.
          </div>
        )}

        {backups.length > 0 && (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.name}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#eee] py-2"
              >
                <div>
                  <div className="font-mono text-sm break-all">{b.name}</div>
                  <div className="text-xs text-gray-600">
                    {b.createdAt
                      ? new Date(b.createdAt).toLocaleString("hr-HR")
                      : "—"}
                    {b.size ? ` • ${Math.round(b.size / 1024)} KB` : ""}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(b.name)}
                    className="px-3 py-1 text-xs bg-[#f7f1e6] border cursor-pointer border-[#c8b59a] rounded-full"
                  >
                    Download
                  </button>

                  <button
                    onClick={() => handleRestore(b.name)}
                    disabled={restoring === b.name}
                    className="px-3 py-1 text-xs bg-[#f37c22] hover:bg-[#d96d1c] text-white rounded-full cursor-pointer disabled:opacity-50"
                  >
                    {restoring === b.name ? "Vraćam..." : "Restore"}
                  </button>

                  <button
                    onClick={() => handleDelete(b.name)}
                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer"
                  >
                    Obriši
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------- */}
      {/*            🔶  AUDIT LOG               */}
      {/* -------------------------------------- */}

      <div className="bg-white rounded-xl border border-[#d9cbb1] shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#0A5E2A]">
            Audit log — aktivnosti u bazi
          </h2>

          <button
            onClick={toggleAudit}
            className="text-sm underline cursor-pointer"
          >
            {auditVisible ? "Sakrij" : "Prikaži"}
          </button>
        </div>

        {auditVisible && (
          <>
            {auditLoading && (
              <div className="text-gray-600 text-sm">Učitavam...</div>
            )}

            {!auditLoading && audit.length === 0 && (
              <div className="text-gray-600 text-sm">
                Nema zabilježenih aktivnosti.
              </div>
            )}

            {!auditLoading && audit.length > 0 && (
              <div className="space-y-2">
                {audit.map((row) => (
                  <div
                    key={row.id}
                    className="border-b py-2 text-sm text-gray-800"
                  >
                    <div>
                      <strong>{row.action}</strong>{" "}
                      <span className="text-gray-600">
                        ({row.table_name}, ID: {row.row_id ?? "?"})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(row.changed_at).toLocaleString("hr-HR")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
