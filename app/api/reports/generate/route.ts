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

function hrDate(str: string | null): string {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}.${m}.${y}.`;
}

function hrTime(str: string | null): string {
  return str?.slice(0, 5) ?? "";
}

function esc(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const roundParam = url.searchParams.get("round");
  const requestedRound = roundParam ? Number(roundParam) : null;

  // --- FETCH PODACI ---
  const [
    { data: teams, error: teamsError },
    { data: fixturesRaw, error: fixturesError },
    { data: standingsRaw, error: standingsError },
  ] = await Promise.all([
    supabase.from("teams").select("id, name"),
    supabase.from("fixtures").select(`
      id,
      league_code,
      round,
      match_date,
      match_time,
      home_team_id,
      away_team_id,
      results:results ( home_goals, away_goals )
    `),
    supabase.from("standings").select("*"),
  ]);

  if (teamsError || fixturesError || standingsError) {
    return new NextResponse("Greška pri dohvaćanju podataka", { status: 500 });
  }

  const fixtures = fixturesRaw || [];
  const standings = standingsRaw || [];

  const teamName = new Map<number, string>();
  teams?.forEach((t) => teamName.set(t.id, t.name));

  // --- AUTOMATSKI ODREDI KOJE KOLO ---
  let lastRound = 1;

  const fixturesWithScore = fixtures.filter((f) => {
    const r = f.results?.[0];
    return r && r.home_goals !== null && r.away_goals !== null;
  });

  for (const f of fixturesWithScore) {
    if (f.round > lastRound) lastRound = f.round;
  }

  const round = requestedRound || lastRound;
  const nextRound = round + 1;

  // --- RENDER FUNKCIJE ---
  function renderResultsTable(league: string) {
    const fx = fixtures
      .filter((f) => f.league_code === league && f.round === round)
      .sort((a, b) =>
        (a.match_date || "").localeCompare(b.match_date || "")
      );

    if (fx.length === 0) return `<p>Nema odigranih utakmica.</p>`;

    const rows = fx
      .map((f, i) => {
        const r = f.results?.[0];
        const score =
          r?.home_goals !== null && r?.away_goals !== null
            ? `${r.home_goals}:${r.away_goals}`
            : "-:-";

        return `
          <tr class="${i % 2 ? "shaded" : ""}">
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
            <th class="col-home">Domaćin</th>
            <th class="col-away">Gost</th>
            <th class="col-score center">Rezultat</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderStandingsTable(league: string) {
    const st = standings.filter((s) => s.league_code === league);

    if (st.length === 0) return `<p>Nema tablice.</p>`;

    const sorted = st
      .map((x) => ({ ...x, name: teamName.get(x.team_id) || "" }))
      .sort(
        (a, b) =>
          b.bodovi - a.bodovi ||
          b.gr - a.gr ||
          b.gplus - a.gplus ||
          a.name.localeCompare(b.name)
      );

    const rows = sorted
      .map((s, i) => {
        return `
          <tr class="${i % 2 ? "shaded" : ""}">
            <td class="center">${i + 1}</td>
            <td class="left">${esc(s.name)}</td>
            <td class="center">${s.ut}</td>
            <td class="center">${s.p}</td>
            <td class="center">${s.n}</td>
            <td class="center">${s.i}</td>
            <td class="center">${s.gplus}</td>
            <td class="center">${s.gminus}</td>
            <td class="center">${s.gr}</td>
            <td class="center">${s.bodovi}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <table>
        <thead>
          <tr class="header">
            <th class="col-rbr">R.br</th>
            <th class="col-team">Ekipa</th>
            <th class="col-num">UT</th>
            <th class="col-num">P</th>
            <th class="col-num">N</th>
            <th class="col-num">I</th>
            <th class="col-num">G+</th>
            <th class="col-num">G-</th>
            <th class="col-num">GR</th>
            <th class="col-num">Bodovi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderNextRound(league: string) {
    const fx = fixtures
      .filter((f) => f.league_code === league && f.round === nextRound)
      .sort((a, b) =>
        (a.match_date || "").localeCompare(b.match_date || "")
      );

    if (fx.length === 0) return `<p>Nema rasporeda.</p>`;

    const rows = fx
      .map((f, i) => {
        return `
          <tr class="${i % 2 ? "shaded" : ""}">
            <td class="center">${hrDate(f.match_date)}</td>
            <td class="center">${hrTime(f.match_time)}</td>
            <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
            <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <table>
        <thead>
          <tr class="header">
            <th class="col-date">Datum</th>
            <th class="col-time">Vrijeme</th>
            <th class="col-team2">Domaćin</th>
            <th class="col-team2">Gost</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // --- CSS BLOK ---
  const css = `
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin:40px; color:#222; }
    h1 { text-align:center; color:#0A5E2A; }
    h2 { text-align:center; color:#0A5E2A; margin-top:40px; }
    h3 { color:#0A5E2A; margin-top:20px; margin-bottom:8px; }

    table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; table-layout: fixed; }
    th, td { padding:6px; border-bottom:1px solid #eee; }
    th { background:#FFF0E6; color:#F37C22; text-align:center; }

    td.left { text-align:left; }
    td.center { text-align:center; }

    .shaded { background:#FFF8F2; }

    .league-section { page-break-after:always; }
    .league-section:last-of-type { page-break-after:auto; }

    footer { text-align:center; margin-top:60px; font-size:12px; color:#F37C22; }

    .col-home { width:40%; }
    .col-away { width:40%; }
    .col-score { width:20%; }

    .col-rbr { width:8%; }
    .col-team { width:32%; }
    .col-num { width:6%; }

    .col-date { width:20%; }
    .col-time { width:12%; }
    .col-team2 { width:34%; }
  `;

  // --- GENERATE HTML ---
  const leaguesHtml = LEAGUES.map((lg) => {
    return `
      <section class="league-section">
        <h2>${lg.label}</h2>

        <h3>Rezultati ${round}. kola</h3>
        ${renderResultsTable(lg.db)}

        <h3>Tablica nakon ${round}. kola</h3>
        ${renderStandingsTable(lg.db)}

        <h3>Iduće kolo (${nextRound}. kolo)</h3>
        ${renderNextRound(lg.db)}
      </section>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="hr">
    <head>
      <meta charset="UTF-8" />
      <title>Izvještaj ${round}. kolo</title>
      <style>${css}</style>
    </head>
    <body>
      <h1>Izvještaj nakon ${round}. kola</h1>
      <div style="text-align:center;color:#F37C22;margin-bottom:20px;">
        malonogometne lige Panadić 2025/26
      </div>

      ${leaguesHtml}

      <footer>panadic.vercel.app</footer>

      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  // SPREMI U TABLICU
  const { data: saved, error: saveError } = await supabase
    .from("reports")
    .insert({ season: "2025/26", round, html })
    .select("id");

  if (saveError || !saved?.[0]) {
    return new NextResponse("Greška pri spremanju izvještaja", { status: 500 });
  }

  return NextResponse.json({ id: saved[0].id });
}
