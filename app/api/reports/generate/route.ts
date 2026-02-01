import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const hrDate = (str: string | null) =>
  str ? `${str.split("-")[2]}.${str.split("-")[1]}.${str.split("-")[0]}.` : "";

const hrTime = (t: string | null) => (t ? t.slice(0, 5) : "");

const getResult = (f: any) => {
  if (!f.results) return null;
  if (!Array.isArray(f.results)) return f.results;
  return f.results.find((r: any) => r.fixture_id === f.id) || null;
};

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const round = Number(url.searchParams.get("round"));

    if (!round || isNaN(round))
      return new NextResponse("Nedostaje broj kola.", { status: 400 });

    const LEAGUES =
      round >= 8
        ? [
            { db: "PIONIRI_REG", label: "Pioniri" },
            { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
            { db: "PRSTICI_REG", label: "Prstići" },
            { db: "POC_GOLD", label: "Zlatna liga" },
            { db: "POC_SILVER", label: "Srebrna liga" },
          ]
        : [
            { db: "PIONIRI_REG", label: "Pioniri" },
            { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
            { db: "PRSTICI_REG", label: "Prstići" },
            { db: "POC_REG_A", label: "Početnici A" },
            { db: "POC_REG_B", label: "Početnici B" },
          ];

    const { data: teams } = await supabase.from("teams").select("id,name");
    const teamName = new Map<number, string>();
    (teams || []).forEach((t) => teamName.set(t.id, t.name));

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
          fixture_id,
          home_goals,
          away_goals
        )
      `)
      .eq("round", round)
      .order("league_code")
      .order("match_date")
      .order("match_time");

    const { data: standings } = await supabase
      .from("standings")
      .select("*");

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
      if (!fx.length) return `<p>Nema utakmica u ovom kolu.</p>`;

      const rows = fx
        .map((f, i) => {
          const r = getResult(f);
          const score =
            r && r.home_goals != null && r.away_goals != null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";

          return `
          <tr ${i % 2 ? 'class="shaded"' : ""}>
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
      </table>`;
    };

    const renderStandings = (lg: string) => {
      const st = (standings || []).filter((s) => s.league_code === lg);
      if (!st.length)
        return `<p><em>Tablica će se formirati nakon prvog odigranog kola.</em></p>`;

      const rows = st
        .sort((a, b) => b.bodovi - a.bodovi || b.gr - a.gr)
        .map(
          (s, i) => `
        <tr ${i % 2 ? 'class="shaded"' : ""}>
          <td class="center">${i + 1}</td>
          <td class="left">${esc(teamName.get(s.team_id) || "")}</td>
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
            <th>R.br</th><th>Ekipa</th><th>UT</th><th>P</th><th>N</th><th>I</th>
            <th>G+</th><th>G-</th><th>GR</th><th>Bodovi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    };

    const renderNext = (lg: string) => {
      const fx = (nextFixtures || []).filter((f) => f.league_code === lg);
      if (!fx.length) return `<p>Nema rasporeda.</p>`;

      const rows = fx
        .map(
          (f, i) => `
        <tr ${i % 2 ? 'class="shaded"' : ""}>
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
            <th>Datum</th><th>Vrijeme</th><th>Domaćin</th><th>Gost</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    };

    const leaguesHtml = LEAGUES.map(
      (lg) => `
      <section class="league-section">
        <h2>${lg.label}</h2>
        <h3>Rezultati ${round}. kola</h3>
        ${renderResults(lg.db)}
        <h3>Tablica nakon ${round}. kola</h3>
        ${renderStandings(lg.db)}
        <h3>Iduće kolo (${round + 1}. kolo)</h3>
        ${renderNext(lg.db)}
      </section>`
    ).join("");

    const html = `
<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8" />
<title>Izvještaj ${round}. kolo</title>
<style>
  body { font-family: system-ui; margin: 40px; color:#222; }
  h1 { text-align:center; color:#0A5E2A; }
  h2 { text-align:center; color:#0A5E2A; margin-top:40px; }
  h3 { color:#0A5E2A; margin-top:25px; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; table-layout: fixed; }
  th, td { padding:4px 6px; border-bottom:1px solid #eee; text-align:center; }
  td.left { text-align:left; }
  .shaded { background:#FFF8F2; }
  .league-section { page-break-after:always; }
  .league-section:last-of-type { page-break-after:auto; }
  footer {
    position: fixed;
    bottom: 20px;
    left: 0;
    right: 0;
    text-align:center;
    color:#F37C22;
    font-size:12px;
  }
</style>
</head>
<body>
  <h1>Izvještaj nakon ${round}. kola</h1>
  <div style="text-align:center;color:#F37C22;margin-bottom:20px;">
    malonogometne lige Panadić 2025/26
  </div>
  ${leaguesHtml}
  <footer>panadic.vercel.app</footer>
</body>
</html>`;

    const { data: inserted, error } = await supabase
      .from("reports")
      .insert({ season: "2025/26", round, html })
      .select("id")
      .single();

    if (error) return new NextResponse("Greška pri spremanju.", { status: 500 });

    return NextResponse.json(inserted);
  } catch (e) {
    console.error(e);
    return new NextResponse("Greška.", { status: 500 });
  }
}
