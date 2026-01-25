import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// SVE LIGE
const ALL_LEAGUES = [
  { db: "PIONIRI_REG", label: "Pioniri" },
  { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
  { db: "PRSTICI_REG", label: "Prstići" },
  { db: "POC_REG_A", label: "Početnici A" },
  { db: "POC_REG_B", label: "Početnici B" },
  { db: "POC_GOLD", label: "Zlatna liga" },
  { db: "POC_SILVER", label: "Srebrna liga" },
];

const hrDate = (str: string | null) =>
  str ? `${str.split("-")[2]}.${str.split("-")[1]}.${str.split("-")[0]}.` : "";

const hrTime = (t: string | null) => (t ? t.slice(0, 5) : "");

const getResult = (f: any) => {
  if (!f.results) return null;
  if (!Array.isArray(f.results)) return f.results;
  return f.results[0] || null;
};

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const round = Number(url.searchParams.get("round"));

    if (!round || isNaN(round))
      return new NextResponse("Nedostaje broj kola.", { status: 400 });

    // 🔴 KLJUČNA LOGIKA – KOJE LIGE POSTOJE U TOM KOLU
    const LEAGUES =
      round >= 8
        ? ALL_LEAGUES.filter(
            (l) => l.db !== "POC_REG_A" && l.db !== "POC_REG_B"
          )
        : ALL_LEAGUES.filter(
            (l) => l.db !== "POC_GOLD" && l.db !== "POC_SILVER"
          );

    const { data: teams } = await supabase
      .from("teams")
      .select("id, name");

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
          ${fx
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
            .join("")}
        </tbody>
      </table>`;
    };

    const renderStandings = (lg: string) => {
      const st = (standings || []).filter((s) => s.league_code === lg);
      if (!st.length) return `<p>Nema tablice.</p>`;

      return `
      <table>
        <thead>
          <tr class="header">
            <th>R.br</th><th>Ekipa</th><th>UT</th><th>P</th><th>N</th>
            <th>I</th><th>G+</th><th>G-</th><th>GR</th><th>Bodovi</th>
          </tr>
        </thead>
        <tbody>
          ${st
            .sort((a, b) => b.bodovi - a.bodovi || b.gr - a.gr)
            .map(
              (s, i) => `
            <tr ${i % 2 ? 'class="shaded"' : ""}>
              <td>${i + 1}</td>
              <td class="left">${esc(teamName.get(s.team_id) || "")}</td>
              <td>${s.ut}</td><td>${s.p}</td><td>${s.n}</td><td>${s.i}</td>
              <td>${s.gplus}</td><td>${s.gminus}</td><td>${s.gr}</td>
              <td>${s.bodovi}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
    };

    const renderNext = (lg: string) => {
      const fx = (nextFixtures || []).filter((f) => f.league_code === lg);
      if (!fx.length) return `<p>Nema rasporeda.</p>`;

      return `
      <table>
        <thead>
          <tr class="header">
            <th>Datum</th><th>Vrijeme</th><th>Domaćin</th><th>Gost</th>
          </tr>
        </thead>
        <tbody>
          ${fx
            .map(
              (f, i) => `
            <tr ${i % 2 ? 'class="shaded"' : ""}>
              <td>${hrDate(f.match_date)}</td>
              <td>${hrTime(f.match_time)}</td>
              <td class="left">${esc(teamName.get(f.home_team_id) || "")}</td>
              <td class="left">${esc(teamName.get(f.away_team_id) || "")}</td>
            </tr>`
            )
            .join("")}
        </tbody>
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
</head>
<body>
<h1>Izvještaj nakon ${round}. kola</h1>
${leaguesHtml}
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
