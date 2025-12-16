import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Lige
const LEAGUES = [
  { db: "PIONIRI_REG", label: "Pioniri" },
  { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
  { db: "PRSTICI_REG", label: "Prstići" },
  { db: "POC_REG_A", label: "Početnici A" },
  { db: "POC_REG_B", label: "Početnici B" },
];

const hrDate = (str: string | null) =>
  str ? `${str.split("-")[2]}.${str.split("-")[1]}.${str.split("-")[0]}.` : "";

const hrTime = (t: string | null) => (t ? t.slice(0, 5) : "");

const getResult = (f: any) => {
  if (!f.results) return null;
  if (!Array.isArray(f.results)) {
    return f.results.fixture_id === f.id ? f.results : null;
  }
  return f.results.find((r: any) => r.fixture_id === f.id) || null;
};

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const round = Number(url.searchParams.get("round"));

    if (!round || isNaN(round)) {
      return new NextResponse("Nedostaje broj kola.", { status: 400 });
    }

    // TEAMS
    const { data: teams } = await supabase.from("teams").select("id, name");
    const teamName = new Map<number, string>();
    (teams || []).forEach((t) => teamName.set(t.id, t.name));

    // FIXTURES
    const { data: fixtures } = await supabase
      .from("fixtures")
      .select(`
        id,
        league_code,
        round,
        match_date,
        match_time,
        home_team_id,
        away_team_id,
        results:results!left (
          id,
          fixture_id,
          home_goals,
          away_goals
        )
      `)
      .eq("round", round)
      .order("league_code")
      .order("match_date")
      .order("match_time");

    // STANDINGS
    const { data: standings } = await supabase
      .from("standings")
      .select("*");

    // NEXT ROUND
    const { data: nextFixtures } = await supabase
      .from("fixtures")
      .select("*")
      .eq("round", round + 1)
      .order("match_date")
      .order("match_time");

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const renderResults = (lg: string) => {
      const fx = (fixtures || []).filter((f) => f.league_code === lg);
      if (fx.length === 0) return `<p>Nema utakmica.</p>`;

      return `
      <table class="data">
        <tr><th>Domaćin</th><th>Gost</th><th>Rezultat</th></tr>
        ${fx
          .map((f, i) => {
            const r = getResult(f);
            const score =
              r && r.home_goals != null && r.away_goals != null
                ? `${r.home_goals}:${r.away_goals}`
                : "-:-";
            return `
            <tr>
              <td>${esc(teamName.get(f.home_team_id) || "")}</td>
              <td>${esc(teamName.get(f.away_team_id) || "")}</td>
              <td>${score}</td>
            </tr>`;
          })
          .join("")}
      </table>`;
    };

    const renderStandings = (lg: string) => {
      const st = (standings || []).filter((s) => s.league_code === lg);
      if (st.length === 0) return `<p>Nema tablice.</p>`;

      const sorted = st
        .map((s) => ({ ...s, name: teamName.get(s.team_id) || "" }))
        .sort(
          (a, b) =>
            b.bodovi - a.bodovi ||
            b.gr - a.gr ||
            b.gplus - a.gplus ||
            a.name.localeCompare(b.name)
        );

      return `
      <table class="data">
        <tr>
          <th>#</th><th>Ekipa</th><th>UT</th><th>P</th><th>N</th><th>I</th>
          <th>G+</th><th>G-</th><th>GR</th><th>B</th>
        </tr>
        ${sorted
          .map(
            (s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(s.name)}</td>
            <td>${s.ut}</td>
            <td>${s.p}</td>
            <td>${s.n}</td>
            <td>${s.i}</td>
            <td>${s.gplus}</td>
            <td>${s.gminus}</td>
            <td>${s.gr}</td>
            <td>${s.bodovi}</td>
          </tr>`
          )
          .join("")}
      </table>`;
    };

    const renderNext = (lg: string) => {
      const fx = (nextFixtures || []).filter((f) => f.league_code === lg);
      if (fx.length === 0) return `<p>Nema rasporeda.</p>`;

      return `
      <table class="data">
        <tr><th>Datum</th><th>Vrijeme</th><th>Domaćin</th><th>Gost</th></tr>
        ${fx
          .map(
            (f) => `
          <tr>
            <td>${hrDate(f.match_date)}</td>
            <td>${hrTime(f.match_time)}</td>
            <td>${esc(teamName.get(f.home_team_id) || "")}</td>
            <td>${esc(teamName.get(f.away_team_id) || "")}</td>
          </tr>`
          )
          .join("")}
      </table>`;
    };

    const leaguesHtml = LEAGUES.map(
      (lg, idx) => `
      ${idx > 0 ? `<div style="page-break-before:always"></div>` : ""}
      <table class="page">
        <tr>
          <td class="content">
            <h2>${lg.label}</h2>
            <h3>Rezultati ${round}. kola</h3>
            ${renderResults(lg.db)}
            <h3>Tablica nakon ${round}. kola</h3>
            ${renderStandings(lg.db)}
            <h3>Iduće kolo (${round + 1}. kolo)</h3>
            ${renderNext(lg.db)}
          </td>
        </tr>
        <tr>
          <td class="footer">panadic.vercel.app</td>
        </tr>
      </table>`
    ).join("");

    const html = `
<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8" />
<title>izvjestaj_kolo_${round}</title>
<style>
  body {
    font-family: Arial, sans-serif;
    margin: 20mm;
    color: #222;
  }

  h1 {
    text-align: center;
    font-size: 22px;
    margin: 0 0 6mm;
    color: #0A5E2A;
  }

  h2 {
    text-align: center;
    font-size: 18px;
    margin: 4mm 0;
    color: #0A5E2A;
  }

  h3 {
    font-size: 14px;
    margin: 3mm 0 2mm;
    color: #0A5E2A;
  }

  table.page {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
  }

  td.content {
    vertical-align: top;
  }

  td.footer {
    vertical-align: bottom;
    text-align: center;
    font-size: 11px;
    color: #F37C22;
    padding-top: 6mm;
  }

  table.data {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 4mm;
  }

  table.data th,
  table.data td {
    border-bottom: 1px solid #ddd;
    padding: 2mm 2mm;
    text-align: center;
  }
</style>
</head>
<body>
  <h1>Izvještaj nakon ${round}. kola</h1>
  <div style="text-align:center;color:#F37C22;margin-bottom:6mm;">
    malonogometne lige Panadić 2025/26
  </div>
  ${leaguesHtml}
</body>
</html>
`;

    const { data: inserted, error } = await supabase
      .from("reports")
      .insert({ season: "2025/26", round, html })
      .select("id, season, round, created_at")
      .single();

    if (error) {
      return new NextResponse("Greška pri spremanju HTML-a.", { status: 500 });
    }

    return NextResponse.json(inserted);
  } catch (e) {
    console.error(e);
    return new NextResponse("Neočekivana greška.", { status: 500 });
  }
}
