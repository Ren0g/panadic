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
  match_date: string;
  match_time: string;
  home_goals: string;
  away_goals: string;
};

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

  // -- helperi
  function formatDateForInput(dateStr: string | null): string {
    if (!dateStr) return '';
    // pretpostavka: u bazi ISO YYYY-MM-DD ili full timestamp
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr; // fallback
    return d.toISOString().slice(0, 10);
  }

  // 💡 DOHVAĆANJE TIMOVA (pretraživač klubova)
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

  // 💡 DOHVAĆANJE SUSRETA
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

  // 💡 OTVARANJE EDIT MODALA
  function openEditModal(fixture: Fixture) {
    const dateInput = formatDateForInput(fixture.match_date);
    const timeInput =
      fixture.match_time?.slice(0, 5) || ''; // pretpostavka HH:MM:SS

    const hg =
      fixture.result && fixture.result.home_goals != null
        ? String(fixture.result.home_goals)
        : '';
    const ag =
      fixture.result && fixture.result.away_goals != null
        ? String(fixture.result.away_goals)
        : '';

    setSelectedFixture(fixture);
    setEditState({
      match_date: dateInput,
      match_time: timeInput,
      home_goals: hg,
      away_goals: ag
    });
    setInfoMessage(null);
    setError(null);
  }

  function closeEditModal() {
    setSelectedFixture(null);
    setEditState(null);
    setSaving(false);
  }

  // 💾 SPREMANJE PROMJENA
  async function handleSaveChanges() {
    if (!selectedFixture || !editState) return;

    setSaving(true);
    setError(null);
    setInfoMessage(null);

    try {
      const match_date = editState.match_date || null;
      const match_time = editState.match_time || null;

      let home_goals: number | null = null;
      let away_goals: number | null = null;

      if (editState.home_goals !== '') {
        const val = Number(editState.home_goals);
        if (Number.isNaN(val)) {
          setError('Broj golova domaćina mora biti broj.');
          setSaving(false);
          return;
        }
        home_goals = val;
      }

      if (editState.away_goals !== '') {
        const val = Number(editState.away_goals);
        if (Number.isNaN(val)) {
          setError('Broj golova gosta mora biti broj.');
          setSaving(false);
          return;
        }
        away_goals = val;
      }

      const body: any = {};
      body.match_date = match_date;
      body.match_time = match_time;

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

      // Nakon uspješnog spremanja, pozovi rekalkulaciju standingsa ZA TAJ SUSRET
      try {
        await fetch(
          `/api/recalculate-standings?fixtureId=${selectedFixture.id}`,
          {
            // pretpostavka: endpoint prihvaća GET; ako traži POST, promijeni method
            method: 'GET'
          }
        );
      } catch (recalcErr) {
        console.error('Greška pri rekalkulaciji ljestvice', recalcErr);
        // ne rušimo spremanje, ali javimo da recalc možda nije prošao
        setInfoMessage(
          'Promjene su spremljene, ali je možda došlo do greške pri rekalkulaciji ljestvice – provjeri standings.'
        );
      }

      // osvježi listu susreta u tablici (lokalno)
      const updatedFixtures = fixtures.map((f) => {
        if (f.id !== selectedFixture.id) return f;
        return {
          ...f,
          match_date,
          match_time,
          result: {
            ...f.result,
            home_goals,
            away_goals
          }
        };
      });
      setFixtures(updatedFixtures);

      setInfoMessage('Promjene spremljene i rekalkulacija pokrenuta.');
      setSaving(false);
      // po želji možeš zatvoriti modal:
      // closeEditModal();
    } catch (err) {
      console.error(err);
      setError('Neočekivana greška pri spremanju promjena.');
      setSaving(false);
    }
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Modifikacija susreta (kola)
      </h1>

      {/* FILTRI */}
      <div className="border rounded-lg p-4 mb-6 space-y-4">
        <h2 className="font-semibold mb-2">Filteri</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Liga (league_code)
            </label>
            <input
              type="text"
              value={leagueCode}
              onChange={(e) => setLeagueCode(e.target.value)}
              placeholder="npr. PIONIRI_REG"
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Kolo (round)
            </label>
            <input
              type="number"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              placeholder="npr. 3"
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Pretraži klub (po nazivu)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="npr. Buna"
                className="border rounded px-2 py-1 flex-1"
              />
              <button
                type="button"
                onClick={handleSearchTeams}
                className="px-3 py-1 border rounded bg-gray-100 text-sm"
              >
                {loadingTeams ? 'Tražim...' : 'Traži klub'}
              </button>
            </div>
          </div>
        </div>

        {/* Rezultati pretrage klubova */}
        {teamOptions.length > 0 && (
          <div className="mt-3">
            <p className="text-sm mb-1">Odaberi klub za filtriranje:</p>
            <div className="flex flex-wrap gap-2">
              {teamOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeam(t)}
                  className={`px-3 py-1 text-sm rounded border ${
                    selectedTeam?.id === t.id
                      ? 'bg-green-600 text-white'
                      : 'bg-white'
                  }`}
                >
                  {t.name} ({t.league_code})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gumb za pretragu susreta */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleSearchFixtures}
            className="px-4 py-2 rounded bg-green-700 text-white text-sm"
            disabled={loading}
          >
            {loading ? 'Pretražujem...' : 'Pretraži susrete'}
          </button>
        </div>
      </div>

      {/* Poruke */}
      {error && (
        <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 text-sm text-blue-700 border border-blue-200 bg-blue-50 px-3 py-2 rounded">
          {infoMessage}
        </div>
      )}

      {/* TABLICA SUSRETA */}
      <div className="border rounded-lg overflow-hidden">
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
                <td
                  colSpan={8}
                  className="p-3 text-center text-gray-500 text-sm"
                >
                  Nema podataka.
                </td>
              </tr>
            )}

            {fixtures.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="p-2 border-b">
                  {formatDateForInput(f.match_date)}
                </td>
                <td className="p-2 border-b">
                  {f.match_time ? f.match_time.slice(0, 5) : ''}
                </td>
                <td className="p-2 border-b">{f.league_code}</td>
                <td className="p-2 border-b">{f.round}</td>
                <td className="p-2 border-b">
                  {f.home?.name || `#${f.home_team_id}`}
                </td>
                <td className="p-2 border-b">
                  {f.away?.name || `#${f.away_team_id}`}
                </td>
                <td className="p-2 border-b">
                  {f.result && f.result.home_goals != null && f.result.away_goals != null
                    ? `${f.result.home_goals}:${f.result.away_goals}`
                    : '-'}
                </td>
                <td className="p-2 border-b">
                  <button
                    type="button"
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

            <p className="text-sm mb-2 text-gray-700">
              {selectedFixture.home?.name || `#${selectedFixture.home_team_id}`}{' '}
              vs{' '}
              {selectedFixture.away?.name || `#${selectedFixture.away_team_id}`}
              <br />
              Liga: {selectedFixture.league_code} | Kolo:{' '}
              {selectedFixture.round}
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={editState.match_date}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, match_date: e.target.value } : prev
                    )
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Vrijeme (HH:MM)
                </label>
                <input
                  type="time"
                  value={editState.match_time}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, match_time: e.target.value } : prev
                    )
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Golovi domaćina
                  </label>
                  <input
                    type="number"
                    value={editState.home_goals}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, home_goals: e.target.value }
                          : prev
                      )
                    }
                    className="border rounded px-2 py-1 w-full"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Golovi gosta
                  </label>
                  <input
                    type="number"
                    value={editState.away_goals}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, away_goals: e.target.value }
                          : prev
                      )
                    }
                    className="border rounded px-2 py-1 w-full"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-2 text-xs text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mb-2 text-xs text-blue-700 border border-blue-200 bg-blue-50 px-2 py-1 rounded">
                {infoMessage}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-3 py-1 text-sm border rounded bg-gray-100"
                disabled={saving}
              >
                Zatvori
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="px-4 py-1 text-sm rounded bg-green-700 text-white"
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
