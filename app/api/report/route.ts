import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LEAGUES = [
  { db: "PIONIRI_REG", label: "Pioniri" },
  { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
  { db: "PRSTICI_REG", label: "Prstići" },
  { db: "POC_REG_A", label: "Početnici A" },
  { db: "POC_REG_B", label: "Početnici B" },
  { db: "POC_GOLD", label: "Zlatna liga" },
  { db: "POC_SILVER", label: "Srebrna liga" },
];

type FixtureRow = {
  id: number;
  league_code: string;
  round: number;
  match_date: string | null;
  match_time: string | null;
  home_team_id: number;
  away_team_id: number;
  results: { home_goals: number | null; away_goals: number | null }[] | null;
};

type StandingRow = {
  league_code: string;
  team_id: number;
  ut: number;
  p: number;
  n: number;
  i: number;
  gplus: number;
  gminus: number;
  gr: number;
  bodovi: number;
  phase: string | null;
  group_code: string | null;
};

function shortTime(t: string | null): string {
  if (!t) return "";
  if (t.length >= 5) return t.slice(0, 5);
  return t;
}

// sigurno escapiranje svega (string/number/null/undefined)
function esc(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// sigurno čitanje rezultata iz fixturea (može biti null, prazan array...)
function safeResult(f: FixtureRow): {
  home: number | null;
  away: number | null;
} {
  const res = Array.isArray(f.results) && f.results.length > 0 ? f.results[0] : null;

  return {
    home: res?.home_goals ?? null,
    away: res?.away_goals ?? null,
  };
}

export async function GET() {
  const [
    { data: teamsData, error: teamsError },
    { data: fixturesRaw, error: fixturesError },
    { data: standingsData, error: standingsError },
  ] = await Promise.all([
    supabase.from("teams").select("id, name"),
    supabase
      .from("fixtures")
      .select(
        `
        id,
        league_code,
        round,
        match_date,
        match_time,
        home_team_id,
        away_team_id,
        results:results ( home_goals, away_goals )
        `
      )
      .order("league_code")
      .order("round")
      .order("match_date"),
    supabase.from("standings").select("*"),
  ]);

  if (!teamsData || !fixturesRaw || !standingsData || teamsError || fixturesError || standingsError) {
    console.error("Greška pri dohvaćanju podataka:", {
      teamsError,
      fixturesError,
      standingsError,
    });
    return new NextResponse("Greška pri dohvaćanju podataka iz Supabase-a", { status: 500 });
  }

  const fixtures: FixtureRow[] = fixturesRaw as any;
  const standings: StandingRow[] = standingsData as any;

  const teamName = new Map<number, string>();
  teamsData.forEach((t: any) => {
    teamName.set(t.id, t.name);
  });

  // --- zadnje odigrano kolo ---
  const fixturesWithResult = fixtures.filter((f) => {
    const { home, away } = safeResult(f);
    return home !== null && away !== null;
  });

  let lastRound = 0;
  for (const f of fixturesWithResult) {
    if (f.round && f.round > lastRound) lastRound = f.round;
  }
  if (lastRound === 0) lastRound = 1;

  const nextRound = lastRound + 1;

  // --- HTML helperi ---

  function renderResultsTable(leagueCode: string) {
    const fxRound = fixtures
      .filter((f) => f.league_code === leagueCode && f.round === lastRound)
      .sort((a, b) => {
        if (a.match_date === b.match_date) {
          return (a.match_time || "").localeCompare(b.match_time || "");
        }
        return (a.match_date || "").localeCompare(b.match_date || "");
      });

    if (fxRound.length === 0) {
      return `<p>Nema odigranih utakmica u ovom kolu.</p>`;
    }

    const rows = fxRound
      .map((f, idx) => {
        const { home, away } = safeResult(f);

        const score =
          home !== null &&
          home !== undefined &&
          away !== null &&
          away !== undefined
            ? `${home}:${away}`
            : "-:-";

        const cls = idx % 2 === 1 ? 'class="shaded"' : "";
        return `
        <tr ${cls}>
          <td class="left">${esc(teamName.get(f.home_team_id) || f.home_team_id)}</td>
          <td class="left">${esc(teamName.get(f.away_team_id) || f.away_team_id)}</td>
          <td class="center">${esc(score)}</td>
        </tr>`;
      })
      .join("");

    return `
      <table>
        <thead>
          <tr class="header">
            <th>Domaćin</th>
            <th>Gost</th>
            <th class="center">Rezultat</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function renderStandingsTable(leagueCode: string) {
    const st = standings.filter((s) => s.league_code === leagueCode);
    if (st.length === 0) {
      return `<p>Nema tablice za ovu ligu.</p>`;
    }

    const enriched = st
      .map((s) => ({
        ...s,
        name: teamName.get(s.team_id) || String(s.team_id),
      }))
      .sort((a, b) => {
        if (b.bodovi !== a.bodovi) return b.bodovi - a.bodovi;
        if (b.gr !== a.gr) return b.gr - a.gr;
        if (b.gplus !== a.gplus) return b.gplus - a.gplus;
        return a.name.localeCompare(b.name);
      });

    const rows = enriched
      .map((s, idx) => {
        const cls = idx % 2 === 1 ? 'class="shaded"' : "";
        const rank = idx + 1;
        return `
        <tr ${cls}>
          <td class="center">${rank}</td>
          <td class="left">${esc(s.name)}</td>
          <td class="center">${s.ut}</td>
          <td class="center">${s.p}</td>
          <td class="center">${s.n}</td>
          <td class="center">${s.i}</td>
          <td class="center">${s.gplus}</td>
          <td class="center">${s.gminus}</td>
          <td class="center">${s.gr}</td>
          <td class="center">${s.bodovi}</td>
        </tr>`;
      })
      .join("");

    return `
      <table>
        <thead>
          <tr class="header">
            <th>R.br</th>
            <th>Ekipa</th>
            <th>UT</th>
            <th>P</th>
            <th>N</th>
            <th>I</th>
            <th>G+</th>
            <th>G-</th>
            <th>GR</th>
            <th>Bodovi</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function renderNextRoundTable(leagueCode: string) {
    const fxNext = fixtures
      .filter((f) => f.league_code === leagueCode && f.round === nextRound)
      .sort((a, b) => {
        if (a.match_date === b.match_date) {
          return (a.match_time || "").localeCompare(b.match_time || "");
        }
        return (a.match_date || "").localeCompare(b.match_date || "");
      });

    if (fxNext.length === 0) {
      return `<p>Nema rasporeda za iduće kolo.</p>`;
    }

    const rows = fxNext
      .map((f, idx) => {
        const cls = idx % 2 === 1 ? 'class="shaded"' : "";
        return `
        <tr ${cls}>
          <td>${esc(f.match_date || "")}</td>
          <td class="center">${esc(shortTime(f.match_time))}</td>
          <td class="left">${esc(teamName.get(f.home_team_id) || f.home_team_id)}</td>
          <td class="left">${esc(teamName.get(f.away_team_id) || f.away_team_id)}</td>
        </tr>`;
      })
      .join("");

    return `
      <table>
        <thead>
          <tr class="header">
            <th>Datum</th>
            <th>Vrijeme</th>
            <th>Domaćin</th>
            <th>Gost</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  const leaguesHtml = LEAGUES.map((lg) => {
    return `
      <section class="league-section">
        <h2>${esc(lg.label)}</h2>

        <h3>Rezultati ${lastRound}. kola</h3>
        ${renderResultsTable(lg.db)}

        <h3>Tablica nakon ${lastRound}. kola</h3>
        ${renderStandingsTable(lg.db)}

        <h3>Iduće kolo (${nextRound}. kolo)</h3>
        ${renderNextRoundTable(lg.db)}
      </section>
    `;
  }).join("");

  const html = `
<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8" />
  <title>Izvještaj nakon ${lastRound}. kola — Panadić 2025/26</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 40px;
      color: #222;
    }
    h1 {
      text-align: center;
      color: #0A5E2A;
      margin-bottom: 8px;
    }
    h2 {
      text-align: center;
      color: #0A5E2A;
      margin-top: 40px;
      margin-bottom: 10px;
    }
    h3 {
      color: #0A5E2A;
      margin-top: 20px;
      margin-bottom: 6px;
    }
    .subtitle {
      text-align: center;
      color: #F37C22;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 12px;
    }
    th, td {
      padding: 4px 6px;
    }
    th {
      background: #FFF0E6;
      color: #F37C22;
      border-bottom: 1px solid #e0d4c5;
    }
    .header {
      background: #FFF0E6;
    }
    .shaded {
      background: #FFF8F2;
    }
    .center {
      text-align: center;
    }
    .left {
      text-align: left;
    }
    tfoot td {
      font-size: 10px;
      text-align: center;
      padding-top: 20px;
      color: #F37C22;
    }
    .league-section {
      page-break-after: always;
    }
    .league-section:last-of-type {
      page-break-after: auto;
    }
  </style>
</head>
<body>
  <h1>Izvještaj nakon ${lastRound}. kola</h1>
  <div class="subtitle">malonogometne lige Panadić 2025/26</div>

  <p style="text-align:center; font-size: 11px; margin-bottom: 40px; color:#555;">
    Automatski generiran izvještaj iz aplikacije <strong>panadic.vercel.app</strong>
  </p>

  ${leaguesHtml}

  <footer>
    <table>
      <tfoot>
        <tr>
          <td>panadic.vercel.app</td>
        </tr>
      </tfoot>
    </table>
  </footer>
</body>
</html>
`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
