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
];

const hrDate = (str: string | null) =>
  !str ? "" : `${str.split("-")[2]}.${str.split("-")[1]}.${str.split("-")[0]}.`;

const hrTime = (t: string | null) => (t ? t.slice(0, 5) : "");

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const round = Number(url.searchParams.get("round"));
    if (!round || isNaN(round))
      return new NextResponse("Nedostaje broj kola.", { status: 400 });

    const season = "2025/26";

    // ───────────────────────────────
    // 1. DOHVAT BAZE
    // ───────────────────────────────
    const [{ data: teams }, { data: fixturesRaw }, { data: standings }] =
      await Promise.all([
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
          .eq("round", round)
          .order("match_date")
          .order("match_time"),
        supabase.from("standings").select("*"),
      ]);

    if (!teams || !fixturesRaw || !standings)
      return new NextResponse("Greška pri dohvaćanju podataka.", {
        status: 500,
      });

    const teamName = new Map<number, string>();
    teams.forEach((t) => teamName.set(t.id, t.name));

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ───────────────────────────────
    // 2. FUNKCIJE ZA RENDER
    // ───────────────────────────────

    const renderResultsTable = (league: string) => {
      const fx = fixturesRaw.filter((f) => f.league_code === league);

      if (fx.length === 0) return `<p>Nema utakmica u ovom kolu.</p>`;

      const rows = fx
        .map((f, i) => {
          const r = f.results?.[0]; // prvo spremanje
          const score =
            r && r.home_goals !== null && r.away_goals !== null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";

          return `
            <tr ${i % 2 ? `class="shaded"` : ""}>
              <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
              <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
              <td class="center">${score}</td>
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
          <tbody>${rows}</tbody>
        </table>
      `;
    };

    const renderStandingsTable = (league: string) => {
      const st = standings.filter((s) => s.league_code === league);
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

      const rows = sorted
        .map(
          (s, i) => `
        <tr ${i % 2 ? `class="shaded"` : ""}>
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
        </tr>`
        )
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
    };

    const { data: nextRaw } = await supabase
      .from("fixtures")
      .select("*")
      .eq("round", round + 1)
      .order("match_date")
      .order("match_time");

    const nextFixtures = nextRaw || [];

    const renderNextRoundTable = (league: string) => {
      const fx = nextFixtures.filter((f: any) => f.league_code === league);
      if (fx.length === 0) return `<p>Nema rasporeda.</p>`;

      const rows = fx
        .map(
          (f, i) => `
        <tr ${i % 2 ? `class="shaded"` : ""}>
          <td class="center">${hrDate(f.match_date)}</td>
          <td class="center">${hrTime(f.match_time)}</td>
          <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
          <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
        </tr>`
        )
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
    };

    // ───────────────────────────────
    // 3. HTML
    // ───────────────────────────────

    const leaguesHtml = LEAGUES.map(
      (lg) => `
      <section class="league-section">
        <h2>${lg.label}</h2>
        <h3>Rezultati ${round}. kola</h3>
        ${renderResultsTable(lg.db)}
        <h3>Tablica nakon ${round}. kola</h3>
        ${renderStandingsTable(lg.db)}
        <h3>Iduće kolo (${round + 1}. kolo)</h3>
        ${renderNextRoundTable(lg.db)}
      </section>`
    ).join("");

    const title = `izvjestaj_kolo_${round}`;

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
  h3 { color:#0A5E2A; margin-top:25px; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
  th, td { padding:4px 6px; border-bottom:1px solid #eee; }
  th { background:#FFF0E6; color:#F37C22; }
  td.left { text-align:left; }
  td.center { text-align:center; }
  .shaded { background:#FFF8F2; }
  .league-section { page-break-after:always; }
  .league-section:last-of-type { page-break-after:auto; }
  footer { text-align:center; margin-top:60px; color:#F37C22; font-size:12px; }
</style>
</head>

<body data-round="${round}">
  <h1>Izvještaj nakon ${round}. kola</h1>
  <div style="text-align:center;color:#F37C22;margin-bottom:20px;">
    malonogometne lige Panadić 2025/26
  </div>

  ${leaguesHtml}

  <footer>panadic.vercel.app</footer>
</body>
</html>
`;

    // ───────────────────────────────
    // 4. SPREMI
    // ───────────────────────────────

    const { data: inserted, error } = await supabase
      .from("reports")
      .insert({ season, round, html })
      .select("id, season, round, created_at")
      .single();

    if (error || !inserted)
      return new NextResponse("Greška pri spremanju arhive", {
        status: 500,
      });

    return NextResponse.json(inserted);
  } catch (e) {
    console.error(e);
    return new NextResponse("Neočekivana greška.", { status: 500 });
  }
}
