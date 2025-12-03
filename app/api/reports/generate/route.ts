// app/api/reports/generate/route.ts
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

function hrDate(str: string | null): string {
  if (!str) return "";
  const parts = str.split("-");
  if (parts.length !== 3) return str;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}.`;
}

function hrTime(t: string | null): string {
  if (!t) return "";
  if (t.length >= 5) return t.slice(0, 5);
  return t;
}

function esc(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  // 0) PROČITAJ KOLO IZ BODY-JA (OPTIONAL)
  let requestedRound: number | null = null;
  try {
    const body = await request.json();
    if (body && typeof body.round === "number" && Number.isFinite(body.round)) {
      requestedRound = body.round;
    }
  } catch {
    // nema body-ja, nije problem
  }

  // 1) PODACI
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

  if (
    !teamsData ||
    !fixturesRaw ||
    !standingsData ||
    teamsError ||
    fixturesError ||
    standingsError
  ) {
    console.error("Greška pri dohvaćanju podataka:", {
      teamsError,
      fixturesError,
      standingsError,
    });
    return new NextResponse("Greška pri dohvaćanju podataka iz Supabase-a", {
      status: 500,
    });
  }

  const fixtures: FixtureRow[] = fixturesRaw as any;
  const standings: StandingRow[] = standingsData as any;

  const teamName = new Map<number, string>();
  teamsData.forEach((t: any) => teamName.set(t.id, t.name));

  // 2) AK NIJE ZADANO KOLO → UZMI NAJVEĆE KOLO ZA KOJE POSTOJI BAREM JEDAN REZULTAT
  let reportRound: number;
  if (requestedRound && requestedRound > 0) {
    reportRound = requestedRound;
  } else {
    const fixturesWithResult = fixtures.filter((f) => {
      const r = f.results?.[0];
      return r && r.home_goals !== null && r.away_goals !== null;
    });

    let lastRound = 1;
    for (const f of fixturesWithResult) {
      if (f.round > lastRound) lastRound = f.round;
    }
    reportRound = lastRound;
  }

  const nextRound = reportRound + 1;
  const season = "2025/26";

  // 3) HELPERI ZA TABLICE

  function renderResultsTable(leagueCode: string) {
    const fxRound = fixtures
      .filter((f) => f.league_code === leagueCode && f.round === reportRound)
      .sort((a, b) =>
        a.match_date === b.match_date
          ? (a.match_time || "").localeCompare(b.match_time || "")
          : (a.match_date || "").localeCompare(b.match_date || "")
      );

    if (fxRound.length === 0) return `<p>Nema odigranih utakmica.</p>`;

    const rows = fxRound
      .map((f, idx) => {
        const r = f.results?.[0] || null;
        const score =
          r && r.home_goals !== null && r.away_goals !== null
            ? `${r.home_goals}:${r.away_goals}`
            : "-:-";
        const cls = idx % 2 ? `class="shaded"` : "";

        return `
          <tr ${cls}>
            <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
            <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
            <td class="center score">${score}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <table class="results-table">
        <colgroup>
          <col />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr class="header">
            <th class="left">Domaćin</th>
            <th class="left">Gost</th>
            <th class="center score">Rezultat</th>
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
      <table class="standings-table">
        <thead>
          <tr class="header">
            <th class="center">R.br</th>
            <th class="left">Ekipa</th>
            <th class="center">UT</th>
            <th class="center">P</th>
            <th class="center">N</th>
            <th class="center">I</th>
            <th class="center">G+</th>
            <th class="center">G-</th>
            <th class="center">GR</th>
            <th class="center">Bodovi</th>
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
          <td class="left">${hrDate(f.match_date)}</td>
          <td class="center">${hrTime(f.match_time)}</td>
          <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
          <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="schedule-table">
        <colgroup>
          <col />
          <col />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr class="header">
            <th class="left">Datum</th>
            <th class="center">Vrijeme</th>
            <th class="left">Domaćin</th>
            <th class="left">Gost</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const leaguesHtml = LEAGUES.map(
    (lg) => `
      <section class="league-section">
        <h2>${esc(lg.label)}</h2>

        <h3>Rezultati ${reportRound}. kola</h3>
        ${renderResultsTable(lg.db)}

        <h3>Tablica nakon ${reportRound}. kola</h3>
        ${renderStandingsTable(lg.db)}

        <h3>Iduće kolo (${nextRound}. kolo)</h3>
        ${renderNextRoundTable(lg.db)}
      </section>
    `
  ).join("");

  const title = `izvjestaj_kolo_${reportRound}`;

  const html = `
<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="file-name" content="${title}.pdf" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; color:#222; }
    h1 { text-align:center; color:#0A5E2A; }
    h2 { text-align:center; color:#0A5E2A; margin-top:40px; }
    h3 { color:#0A5E2A; margin-top:20px; }

    table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
    th { background:#FFF0E6; color:#F37C22; padding:4px 6px; }
    td { padding:4px 6px; }
    .left { text-align:left; }
    .center { text-align:center; }
    .score { font-weight:bold; }

    .shaded { background:#FFF8F2; }
    .league-section { page-break-after:always; }
    .league-section:last-of-type { page-break-after:auto; }

    table.results-table col:nth-child(1),
    table.results-table col:nth-child(2) { width:40%; }
    table.results-table col:nth-child(3) { width:20%; }

    table.schedule-table col:nth-child(1) { width:25%; }
    table.schedule-table col:nth-child(2) { width:15%; }
    table.schedule-table col:nth-child(3) { width:30%; }
    table.schedule-table col:nth-child(4) { width:30%; }

    footer {
      position: fixed;
      bottom: 16px;
      left: 0;
      right: 0;
      text-align: center;
      color:#F37C22;
      font-size: 12px;
    }
  </style>
</head>

<body data-round="${reportRound}">
  <h1>Izvještaj nakon ${reportRound}. kola</h1>
  <div class="subtitle" style="text-align:center;color:#F37C22;margin-bottom:20px;">
    malonogometne lige Panadić 2025/26
  </div>

  ${leaguesHtml}

  <footer>panadic.vercel.app</footer>
</body>
</html>
`;

  // 4) SPREMI U TABLICU reports
  const { data: inserted, error: insertError } = await supabase
    .from("reports")
    .insert({
      season,
      round: reportRound,
      html,
    })
    .select("id, season, round, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("Greška pri spremanju izvještaja u arhivu:", insertError);
    return new NextResponse("Greška pri spremanju arhive", { status: 500 });
  }

  return NextResponse.json(inserted);
}
