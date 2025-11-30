import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// SAMO REGULARNE LIGE – bez Zlatne i Srebrne
const LEAGUES = [
  { db: "PIONIRI_REG", label: "Pioniri" },
  { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
  { db: "PRSTICI_REG", label: "Prstići" },
  { db: "POC_REG_A", label: "Početnici A" },
  { db: "POC_REG_B", label: "Početnici B" },
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

// HR DATUM – iz "2025-12-06" u "06.12.2025."
function hrDate(str: string | null): string {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}.${m}.${y}.`;
}

// HR VRIJEME – "17:18:00" -> "17:18"
function hrTime(t: string | null): string {
  return t?.slice(0, 5) ?? "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const print = url.searchParams.get("print") === "1";
  const raw = url.searchParams.get("raw") === "1";

  // --- 1. PODACI IZ BAZE ---
  const [
    { data: teamsData, error: teamsError },
    { data: fixturesRaw, error: fixturesError },
    { data: standingsData, error: standingsError },
  ] = await Promise.all([
    supabase.from("teams").select("id, name"),
    supabase
      .from("fixtures")
      .select(`
        id,
        league_code,
        round,
        match_date,
        match_time,
        home_team_id,
        away_team_id,
        results:results ( home_goals, away_goals )
      `)
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
  teamsData.forEach((t: any) => teamName.set(t.id, t.name));

  // --- 2. ODREDI ZADNJE KOLO ---
  const fixturesWithResult = fixtures.filter((f) => {
    const r = f.results?.[0];
    return r && r.home_goals !== null && r.away_goals !== null;
  });

  let lastRound = 1;
  for (const f of fixturesWithResult) {
    if (f.round > lastRound) lastRound = f.round;
  }

  const nextRound = lastRound + 1;

  // --- 3. HELPERI ---
  function esc(str: string) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ------------------- TABLICE -------------------

  function renderResultsTable(leagueCode: string) {
    const fxRound = fixtures
      .filter((f) => f.league_code === leagueCode && f.round === lastRound)
      .sort((a, b) =>
        a.match_date === b.match_date
          ? (a.match_time || "").localeCompare(b.match_time || "")
          : (a.match_date || "").localeCompare(b.match_date || "")
      );

    if (fxRound.length === 0) return `<p>Nema odigranih utakmica.</p>`;

    const rows = fxRound
      .map((f, idx) => {
        const r = f.results?.[0];
        const score =
          r && r.home_goals !== null && r.away_goals !== null
            ? `${r.home_goals}:${r.away_goals}`
            : "-:-";
        const cls = idx % 2 ? `class="shaded"` : "";

        return `
          <tr ${cls}>
            <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
            <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
            <td class="center">${score}</td>
          </tr>
        `;
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
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderStandingsTable(leagueCode: string) {
    const st = standings.filter((s) => s.league_code === leagueCode);
    if (st.length === 0) return `<p>Nema tablice.</p>`;

    const enr = st
      .map((s) => ({ ...s, name: teamName.get(s.team_id) || "" }))
      .sort(
        (a, b) =>
          b.bodovi - a.bodovi ||
          b.gr - a.gr ||
          b.gplus - a.gplus ||
          a.name.localeCompare(b.name)
      );

    const rows = enr
      .map((s, idx) => {
        const cls = idx % 2 ? `class="shaded"` : "";
        return `
        <tr ${cls}>
          <td class="center">${idx + 1}</td>
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
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderNextRoundTable(leagueCode: string) {
    const fx = fixtures
      .filter((f) => f.league_code === leagueCode && f.round === nextRound)
      .sort((a, b) =>
        a.match_date === b.match_date
          ? (a.match_time || "").localeCompare(b.match_time || "")
          : (a.match_date || "").localeCompare(b.match_date || "")
      );

    if (fx.length === 0) return `<p>Nema rasporeda.</p>`;

    const rows = fx
      .map((f, idx) => {
        const cls = idx % 2 ? `class="shaded"` : "";
        return `
        <tr ${cls}>
          <td>${hrDate(f.match_date)}</td>
          <td class="center">${hrTime(f.match_time)}</td>
          <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
          <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
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
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ------------------- HTML -------------------

  const leaguesHtml = LEAGUES.map(
    (lg) => `
      <section class="league-section">
        <h2>${esc(lg.label)}</h2>

        <h3>Rezultati ${lastRound}. kola</h3>
        ${renderResultsTable(lg.db)}

        <h3>Tablica nakon ${lastRound}. kola</h3>
        ${renderStandingsTable(lg.db)}

        <h3>Iduće kolo (${nextRound}. kolo)</h3>
        ${renderNextRoundTable(lg.db)}
      </section>
  `
  ).join("");

  const title = `izvjestaj_kolo_${lastRound}`;

  const autoPrintScript = print
    ? `<script>window.onload = () => window.print();</script>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="file-name" content="${title}.pdf" />
  <style>
    body { font-family: system-ui; margin: 40px; color:#222; }
    h1 { text-align:center; color:#0A5E2A; }
    h2 { text-align:center; color:#0A5E2A; margin-top:40px; }
    h3 { color:#0A5E2A; margin-top:20px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
    th { background:#FFF0E6; color:#F37C22; padding:4px; }
    td { padding:4px 6px; }
    .left { text-align:left; }
    .center { text-align:center; }
    .shaded { background:#FFF8F2; }
    .league-section { page-break-after:always; }
    .league-section:last-of-type { page-break-after:auto; }
  </style>
</head>

<body data-round="${lastRound}">
  <h1>Izvještaj nakon ${lastRound}. kola</h1>
  <div class="subtitle" style="text-align:center;color:#F37C22;margin-bottom:20px;">
    malonogometne lige Panadić 2025/26
  </div>

  ${leaguesHtml}

  <footer style="text-align:center;margin-top:40px;color:#F37C22;">
    panadic.vercel.app
  </footer>

  ${autoPrintScript}
</body>
</html>
`;

  // RAW MODE (za arhivu)
  if (raw) {
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
