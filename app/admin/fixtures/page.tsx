'use client';

import { useState } from 'react';

type TeamOption = {
  id: number;
  name: string;
  league_code: string;
};

type FixtureResult = {
  home_goals: number | null;
  away_goals: number | null;
};

type Fixture = {
  id: number;
  league_code: string;
  round: number;
  match_date: string | null;
  match_time: string | null;
  home_team_id: number;
  away_team_id: number;
  home?: { name: string } | null;
  away?: { name: string } | null;
  result?: FixtureResult | null;
};

type EditState = {
  match_date: string;
  match_time: string;
  home_goals: string;
  away_goals: string;
};

// ----------------------------------------------------------
// FORMATIRANJE
// ----------------------------------------------------------

function formatDateToCro(dateIso: string | null): string {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

function formatDateToIso(cro: string): string {
  const clean = cro.replace(/\./g, '').trim();
  const dd = clean.slice(0, 2);
  const mm = clean.slice(2, 4);
  const yyyy = clean.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeToCro(t: string | null): string {
  return t ? t.slice(0, 5) : '';
}

// ----------------------------------------------------------
// LIGE
// ----------------------------------------------------------

const LEAGUES = [
  { label: 'Pioniri', value: 'PIONIRI_REG' },
  { label: 'Mlađi pioniri', value: 'MLPIONIRI_REG' },
  { label: 'Prstići', value: 'PRSTICI_REG' },
  { label: 'Početnici A', value: 'POC_REG_A' },
  { label: 'Početnici B', value: 'POC_REG_B' },
  { label: 'Zlatna liga', value: 'POC_GOLD' },
  { label: 'Srebrna liga', value: 'POC_SILVER' }
];

// ----------------------------------------------------------
// STRANICA
// ----------------------------------------------------------

export default function AdminFixturesPage() {
  const [leagueCode, setLeagueCode] = useState<string>('');
  const [round, setRound] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null);

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // ----------------------------------------------------------
  // PRETRAGA KLUBOVA
  // ----------------------------------------------------------

  async function handleSearchTeams() {
    setError(null);
    setInfoMessage(null);

    if (!teamSearch && !leagueCode) {
      setError('Unesi ime kluba ili odaberi ligu.');
      return;
    }

    setLoadingTeams(true);

    try {
      const params = new URLSearchParams();
      if (teamSearch) params.set('search', teamSearch);
      if (leagueCode) params.set('leagueCode', leagueCode);

      const res = await fetch(`/api/admin/teams?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Greška pri dohvaćanju klubova.');
        setTeamOptions([]);
        return;
      }

      setTeamOptions(data.teams || []);
      if ((data.teams || []).length === 0) {
        setInfoMessage('Nema klubova.');
      }
    } catch (err) {
      console.error(err);
      setError('Greška pri pretrazi klubova.');
    } finally {
      setLoadingTeams(false);
    }
  }

  // ----------------------------------------------------------
  // PRETRAGA SUSRETA
  // ----------------------------------------------------------

  async function handleSearchFixtures() {
    setError(null);
    setInfoMessage(null);
    setFixtures([]);

    if (!leagueCode && !round && !selectedTeam) {
      setError('Postavi barem jedan filter.');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (leagueCode) params.set('leagueCode', leagueCode);
      if (round) params.set('round', round);
      if (selectedTeam) params.set('teamId', String(selectedTeam.id));

      const res = await fetch(`/api/admin/fixtures?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Greška pri dohvaćanju susreta.');
        return;
      }

      const fetched: Fixture[] = data.fixtures || [];

      fetched.forEach((f: any) => {
        if (Array.isArray(f.result)) {
          f.result = f.result.length > 0 ? f.result[0] : null;
        }
      });

      setFixtures(fetched);

      if (fetched.length === 0) {
        setInfoMessage('Nema susreta za filtere.');
      }
    } catch (err) {
      console.error(err);
      setError('Neočekivana greška.');
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // MODAL
  // ----------------------------------------------------------

  function openEditModal(f: Fixture) {
    setSelectedFixture(f);

    setEditState({
      match_date: formatDateToCro(f.match_date),
      match_time: formatTimeToCro(f.match_time),
      home_goals: f.result?.home_goals != null ? String(f.result.home_goals) : '',
      away_goals: f.result?.away_goals != null ? String(f.result.away_goals) : ''
    });

    setError(null);
    setInfoMessage(null);
  }

  function closeEditModal() {
    setSelectedFixture(null);
    setEditState(null);
    setSaving(false);
  }

  async function handleSaveChanges() {
    if (!selectedFixture || !editState) return;

    setSaving(true);
    setError(null);
    setInfoMessage(null);

    try {
      const isoDate = editState.match_date ? formatDateToIso(editState.match_date) : null;
      const finalTime = editState.match_time || null;

      const home_goals = editState.home_goals !== '' ? Number(editState.home_goals) : null;
      const away_goals = editState.away_goals !== '' ? Number(editState.away_goals) : null;

      const body: any = {
        match_date: isoDate,
        match_time: finalTime
      };

      if (home_goals !== null || away_goals !== null) {
        body.result = { home_goals, away_goals };
      }

      const res = await fetch(`/api/admin/fixtures/${selectedFixture.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Greška pri spremanju.');
        setSaving(false);
        return;
      }

      await fetch(`/api/recalculate-standings?fixtureId=${selectedFixture.id}`);

      const updated = fixtures.map((x) =>
        x.id === selectedFixture.id
          ? {
              ...x,
              match_date: isoDate,
              match_time: finalTime,
              result: { home_goals, away_goals }
            }
          : x
      );

      setFixtures(updated);
      setInfoMessage('Promjene spremljene.');
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('Neočekivana greška.');
      setSaving(false);
    }
  }

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modifikacija susreta (kola)</h1>

      {/* POVRATAK */}
      <button
        onClick={() => (window.location.href = '/admin')}
        className="mb-6 px-4 py-2 rounded bg-[#f7f1e6] border border-[#c8b59a] text-[#0A5E2A] shadow"
      >
        ← Povratak na Admin panel
      </button>

      {/* FILTERI */}
      <div className="border rounded-lg p-4 mb-6 bg-[#f7f1e6]">
        <h2 className="font-semibold mb-2">Filteri</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* LIGA */}
          <div>
            <label className="text-sm font-medium">Liga</label>
            <select
              value={leagueCode}
              onChange={(e) => setLeagueCode(e.target.value)}
              className="border rounded px-2 py-2 w-full bg-white"
            >
              <option value="">— Odaberi ligu —</option>
              {LEAGUES.map((lg) => (
                <option key={lg.value} value={lg.value}>
                  {lg.label}
                </option>
              ))}
            </select>
          </div>

          {/* KOLO */}
          <div>
            <label className="text-sm font-medium">Kolo</label>
            <input
              type="number"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="border rounded px-2 py-2 w-full bg-white"
            />
          </div>

          {/* KLUB */}
          <div>
            <label className="text-sm font-medium">Pretraži klub</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="border rounded px-2 py-2 w-full bg-white"
              />
              <button
                onClick={handleSearchTeams}
                className="px-4 py-2 border rounded bg-white"
              >
                {loadingTeams ? '...' : 'Traži'}
              </button>
            </div>
          </div>

        </div>

        {/* KLUBOVI */}
        {teamOptions.length > 0 && (
          <div className="mt-3">
            <p className="text-sm mb-1">Odaberi klub:</p>
            <div className="flex flex-wrap gap-2">
              {teamOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeam(t)}
                  className={`px-3 py-1 border rounded text-sm ${
                    selectedTeam?.id === t.id
                      ? 'bg-green-600 text-white'
                      : 'bg-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <button
          onClick={handleSearchFixtures}
          className="px-6 py-2 mt-4 rounded bg-green-700 text-white"
        >
          Pretraži susrete
        </button>
      </div>

      {/* PORUKE */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 bg-blue-100 border border-blue-300 text-blue-700 px-3 py-2 rounded text-sm">
          {infoMessage}
        </div>
      )}

      {/* TABLICA – sada mobile-friendly */}
      <div className="space-y-4">

        {fixtures.length === 0 && !loading && (
          <div className="text-center text-gray-500">Nema podataka.</div>
        )}

        {fixtures.map((f) => {
          const date = formatDateToCro(f.match_date);
          const time = formatTimeToCro(f.match_time);
          const league = LEAGUES.find((l) => l.value === f.league_code)?.label;

          return (
            <div
              key={f.id}
              className="
                bg-white border rounded-lg p-3 shadow-sm 
                flex flex-col sm:flex-row sm:justify-between sm:items-center
                gap-3
              "
            >
              {/* Lijevo – info */}
              <div className="flex-1">
                <div className="font-semibold">
                  {f.home?.name} vs {f.away?.name}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {date} • {time}
                </div>

                <div className="text-xs text-gray-500 mt-1">{league}</div>

                <div className="text-xs text-gray-500">
                  {f.round}. kolo
                </div>
              </div>

              {/* Desno – rezultat + Uredi */}
              <div className="flex sm:flex-row flex-col items-end sm:items-center gap-2">

                <div className="text-lg font-bold text-[#0b5b2a]">
                  {f.result && f.result.home_goals != null
                    ? `${f.result.home_goals}:${f.result.away_goals}`
                    : '—'}
                </div>

                <button
                  onClick={() => openEditModal(f)}
                  className="px-4 py-1 border rounded bg-white hover:bg-gray-100 text-sm"
                >
                  Uredi
                </button>

              </div>
            </div>
          );
        })}

      </div>

      {/* MODAL */}
      {selectedFixture && editState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-lg">

            <h2 className="text-lg font-semibold mb-2">
              Uredi susret #{selectedFixture.id}
            </h2>

            <div className="text-sm text-gray-700 mb-3">
              {selectedFixture.home?.name} vs {selectedFixture.away?.name}
              <br />
              Liga:{' '}
              {LEAGUES.find((l) => l.value === selectedFixture.league_code)?.label}{' '}
              | {selectedFixture.round}. kolo
            </div>

            {/* FORM */}
            <div className="space-y-3">

              <div>
                <label className="text-sm font-medium">Datum</label>
                <input
                  type="text"
                  value={editState.match_date}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, match_date: e.target.value } : prev
                    )
                  }
                  className="border rounded px-2 py-2 w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Vrijeme</label>
                <input
                  type="text"
                  value={editState.match_time}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, match_time: e.target.value } : prev
                    )
                  }
                  className="border rounded px-2 py-2 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Golovi domaćina</label>
                  <input
                    type="number"
                    min={0}
                    value={editState.home_goals}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, home_goals: e.target.value } : prev
                      )
                    }
                    className="border rounded px-2 py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Golovi gosta</label>
                  <input
                    type="number"
                    min={0}
                    value={editState.away_goals}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, away_goals: e.target.value } : prev
                      )
                    }
                    className="border rounded px-2 py-2 w-full"
                  />
                </div>
              </div>

            </div>

            {/* PORUKE */}
            {error && (
              <div className="mt-3 bg-red-100 border border-red-300 text-red-700 px-3 py-1 rounded text-sm">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mt-3 bg-blue-100 border border-blue-300 text-blue-700 px-3 py-1 rounded text-sm">
                {infoMessage}
              </div>
            )}

            {/* GUMBI */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border rounded bg-gray-200"
              >
                Zatvori
              </button>

              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="px-4 py-2 bg-green-700 text-white rounded"
              >
                {saving ? 'Spremam…' : 'Spremi i ažuriraj'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
