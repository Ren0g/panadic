'use client';

import { useState } from 'react';

type TeamOption = {
  id: number;
  name: string;
  league_code: string;
};

type FixtureResult = {
  id?: number;
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
  home?: { id: number; name: string } | null;
  away?: { id: number; name: string } | null;
  result?: FixtureResult | null;
};

type EditState = {
  match_date: string; // dd.mm.yyyy.
  match_time: string; // HH:MM
  home_goals: string;
  away_goals: string;
};

// ----------- FORMATIRANJE DATUMA I VREMENA -----------
function formatDateToCro(dateIso: string | null): string {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}.${month}.${year}.`;
}

function formatDateToIso(croDate: string): string {
  // očekuje format dd.mm.yyyy.
  const clean = croDate.replace(/\./g, '').trim();
  if (!clean) return '';

  const day = clean.slice(0, 2);
  const month = clean.slice(2, 4);
  const year = clean.slice(4, 8);

  return `${year}-${month}-${day}`;
}

function formatTimeToCro(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

// ------------------------------------------------------

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

  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // ----------- TIMOVI -----------
  async function handleSearchTeams() {
    setError(null);
    setInfoMessage(null);

    if (!teamSearch && !leagueCode) {
      setError('Unesi ime kluba ili league_code za pretragu klubova.');
      return;
    }

    setLoadingTeams(true);
    try {
      const params = new URLSearchParams();
      if (teamSearch) params.set('search', teamSearch);
      if (leagueCode) params.set('leagueCode', leagueCode);

      const res = await fetch(`/api/admin/teams?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Greška pri dohvaćanju klubova.');
        setTeamOptions([]);
        return;
      }

      setTeamOptions(data.teams || []);
      if ((data.teams || []).length === 0) {
        setInfoMessage('Nema klubova za zadane kriterije.');
      }
    } catch (err) {
      console.error(err);
      setError('Neočekivana greška pri pretraživanju klubova.');
    } finally {
      setLoadingTeams(false);
    }
  }

  // ----------- SUSRETI -----------
  async function handleSearchFixtures() {
    setError(null);
    setInfoMessage(null);
    setFixtures([]);

    if (!leagueCode && !round && !selectedTeam) {
      setError('Unesi barem jedan filter (liga, kolo ili klub).');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (leagueCode) params.set('leagueCode', leagueCode);
      if (round) params.set('round', round);
      if (selectedTeam) params.set('teamId', String(selectedTeam.id));

      const res = await fetch(`/api/admin/fixtures?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Greška pri dohvaćanju susreta.');
        return;
      }

      const fixturesData: Fixture[] = data.fixtures || [];

      // 🟢 ispravimo rezultat — u API response-u je "result: [{...}]"
      fixturesData.forEach((fix: any) => {
        if (Array.isArray(fix.result)) {
          fix.result = fix.result.length > 0 ? fix.result[0] : null;
        }
      });

      setFixtures(fixturesData);

      if (fixturesData.length === 0) {
        setInfoMessage('Nema susreta za zadane kriterije.');
      }
    } catch (err) {
      console.error(err);
      setError('Neočekivana greška pri pretraživanju susreta.');
    } finally {
      setLoading(false);
    }
  }

  // ----------- EDIT MODAL -----------
  function openEditModal(fixture: Fixture) {
    const croDate = fixture.match_date ? formatDateToCro(fixture.match_date) : '';
    const croTime = fixture.match_time ? formatTimeToCro(fixture.match_time) : '';

    setSelectedFixture(fixture);
    setEditState({
      match_date: croDate,
      match_time: croTime,
      home_goals: fixture.result?.home_goals != null ? String(fixture.result.home_goals) : '',
      away_goals: fixture.result?.away_goals != null ? String(fixture.result.away_goals) : ''
    });

    setInfoMessage(null);
    setError(null);
  }

  function closeEditModal() {
    setSelectedFixture(null);
    setEditState(null);
    setSaving(false);
  }

  // ----------- SPREMANJE -----------
  async function handleSaveChanges() {
    if (!selectedFixture || !editState) return;

    setSaving(true);
    setError(null);
    setInfoMessage(null);

    try {
      const isoDate = editState.match_date ? formatDateToIso(editState.match_date) : null;
      const finalTime = editState.match_time || null;

      let home_goals: number | null = null;
      let away_goals: number | null = null;

      if (editState.home_goals !== '') {
        const val = Number(editState.home_goals);
        if (isNaN(val)) {
          setError('Broj golova domaćina mora biti broj.');
          setSaving(false);
          return;
        }
        home_goals = val;
      }

      if (editState.away_goals !== '') {
        const val = Number(editState.away_goals);
        if (isNaN(val)) {
          setError('Broj golova gosta mora biti broj.');
          setSaving(false);
          return;
        }
        away_goals = val;
      }

      const body: any = {
        match_date: isoDate,
        match_time: finalTime
      };

      if (home_goals !== null || away_goals !== null) {
        body.result = {
          home_goals,
          away_goals
        };
      }

      const res = await fetch(`/api/admin/fixtures/${selectedFixture.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Greška pri spremanju promjena.');
        setSaving(false);
        return;
      }

      // pokreni rekalkulaciju
      await fetch(`/api/recalculate-standings?fixtureId=${selectedFixture.id}`);

      // update UI lokalno
      const updatedFixtures = fixtures.map((f) =>
        f.id === selectedFixture.id
          ? {
              ...f,
              match_date: isoDate,
              match_time: finalTime,
              result: { home_goals, away_goals }
            }
          : f
      );

      setFixtures(updatedFixtures);
      setInfoMessage('Promjene spremljene i rekalkulacija pokrenuta.');
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError('Neočekivana greška pri spremanju promjena.');
      setSaving(false);
    }
  }

  // -------------- UI ------------------

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modifikacija susreta (kola)</h1>

      {/* FILTERI */}
      <div className="border rounded-lg p-4 mb-6 space-y-4 bg-[#f7f1e6]">
        <h2 className="font-semibold mb-2">Filteri</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Liga */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Liga (league_code)</label>
            <input
              type="text"
              value={leagueCode}
              onChange={(e) => setLeagueCode(e.target.value)}
              placeholder="npr. PIONIRI_REG"
              className="border rounded px-2 py-2 w-full"
            />
          </div>

          {/* Kolo */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Kolo (round)</label>
            <input
              type="number"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              placeholder="npr. 3"
              className="border rounded px-2 py-2 w-full"
            />
          </div>

          {/* Klub */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Pretraži klub</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="npr. Buna"
                className="border rounded px-2 py-2 flex-1"
              />
              <button
                onClick={handleSearchTeams}
                className="px-4 py-2 border rounded bg-white text-sm"
              >
                {loadingTeams ? '...' : 'Traži'}
              </button>
            </div>
          </div>
        </div>

        {/* Rezultati klubova */}
        {teamOptions.length > 0 && (
          <>
            <p className="text-sm mt-3 mb-1">Odaberi klub:</p>
            <div className="flex flex-wrap gap-2">
              {teamOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeam(t)}
                  className={`px-3 py-1 text-sm rounded border ${
                    selectedTeam?.id === t.id ? 'bg-green-600 text-white' : 'bg-white'
                  }`}
                >
                  {t.name} ({t.league_code})
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={handleSearchFixtures}
          className="px-6 py-2 rounded bg-green-700 text-white text-sm mt-4"
          disabled={loading}
        >
          {loading ? 'Pretražujem...' : 'Pretraži susrete'}
        </button>
      </div>

      {/* PORUKE */}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-100 px-3 py-2 rounded border">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded border">
          {infoMessage}
        </div>
      )}

      {/* TABLICA */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border-b text-left">Datum</th>
              <th className="p-2 border-b text-left">Vrijeme</th>
              <th className="p-2 border-b text-left">Liga</th>
              <th className="p-2 border-b text-left">Kolo</th>
              <th className="p-2 border-b text-left">Domaći</th>
              <th className="p-2 border-b text-left">Gosti</th>
              <th className="p-2 border-b text-left">Rezultat</th>
              <th className="p-2 border-b text-left">Akcija</th>
            </tr>
          </thead>

          <tbody>
            {fixtures.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-3 text-center text-gray-500">
                  Nema podataka.
                </td>
              </tr>
            )}

            {fixtures.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="p-2 border-b">
                  {formatDateToCro(f.match_date)}
                </td>
                <td className="p-2 border-b">
                  {formatTimeToCro(f.match_time)}
                </td>
                <td className="p-2 border-b">{f.league_code}</td>
                <td className="p-2 border-b">{f.round}</td>
                <td className="p-2 border-b">{f.home?.name}</td>
                <td className="p-2 border-b">{f.away?.name}</td>
                <td className="p-2 border-b">
                  {f.result && f.result.home_goals != null
                    ? `${f.result.home_goals}:${f.result.away_goals}`
                    : '-'}
                </td>
                <td className="p-2 border-b">
                  <button
                    onClick={() => openEditModal(f)}
                    className="px-3 py-1 text-xs rounded border bg-white hover:bg-gray-100"
                  >
                    Uredi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {selectedFixture && editState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-3">
              Uredi susret #{selectedFixture.id}
            </h2>

            <p className="text-sm mb-4 text-gray-700">
              {selectedFixture.home?.name} vs {selectedFixture.away?.name}
              <br />
              Liga: {selectedFixture.league_code} | Kolo: {selectedFixture.round}
            </p>

            <div className="space-y-3 mb-4">
              {/* Datum */}
              <div>
                <label className="block text-sm font-medium mb-1">Datum</label>
                <input
                  type="text"
                  value={editState.match_date}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, match_date: e.target.value } : prev
                    )
                  }
                  placeholder="dd.mm.yyyy."
                  className="border rounded px-2 py-2 w-full"
                />
              </div>

              {/* Vrijeme */}
              <div>
                <label className="block text-sm font-medium mb-1">Vrijeme</label>
                <input
                  type="text"
                  value={editState.match_time}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, match_time: e.target.value } : prev
                    )
                  }
                  placeholder="HH:MM"
                  className="border rounded px-2 py-2 w-full"
                />
              </div>

              {/* Golovi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Golovi domaćina
                  </label>
                  <input
                    type="number"
                    value={editState.home_goals}
                    min={0}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, home_goals: e.target.value } : prev
                      )
                    }
                    className="border rounded px-2 py-2 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Golovi gosta
                  </label>
                  <input
                    type="number"
                    value={editState.away_goals}
                    min={0}
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

            {/* Poruke */}
            {error && (
              <div className="mb-2 text-xs text-red-600 bg-red-100 border px-2 py-1 rounded">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mb-2 text-xs text-blue-700 bg-blue-100 border px-2 py-1 rounded">
                {infoMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={closeEditModal}
                className="px-3 py-2 text-sm border rounded bg-gray-200"
                disabled={saving}
              >
                Zatvori
              </button>

              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 text-sm rounded bg-green-700 text-white"
                disabled={saving}
              >
                {saving ? 'Spremam...' : 'Spremi i ažuriraj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
