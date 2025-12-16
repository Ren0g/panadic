import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  if (!Array.isArray(f.results)) return f.results;
  return f.results[0] || null;
};

export async function POST(request: Request) {
  try {
    const round = Number(new URL(request.url).searchParams.get("round"));
    if (!round) return new NextResponse("Nedostaje kolo", { status: 400 });

    const { data: teams } = await supabase.from("teams").select("id,name");
    const teamName = new Map<number, string>();
    (teams || []).forEach(t => teamName.set(t.id, t.name));

    const { data: fixtures } = await supabase
      .from("fixtures")
      .select(`
        id, league_code, match_date, match_time,
        home_team_id, away_team_id,
        results:results!left ( home_goals, away_goals )
      `)
      .eq("round", round)
      .order("match_date")
      .order("match_time");

    const { data: standings } = await supabase.from("standings").select("*");

    const { data: nextFixtures } = await supabase
      .from("fixtures")
      .select("*")
      .eq("round", round + 1)
      .order("match_date")
      .order("match_time");

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const leaguesHtml = LEAGUES.map(
      lg => `
<div class="league">
  <h2>${lg.label}</h2>

  <h3>Rezultati ${round}. kola</h3>
  <table>
    <thead>
      <tr><th>Domaćin</th><th>Gost</th><th>Rezultat</th></tr>
    </thead>
    <tbody>
      ${(fixtures || [])
        .filter(f => f.league_code === lg.db)
        .map(f => {
          const r = getResult(f);
          const score =
            r && r.home_goals != null && r.away_goals != null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";
          return `<tr>
            <td>${esc(teamName.get(f.home_team_id) || "")}</td>
            <td>${esc(teamName.get(f.away_team_id) || "")}</td>
            <td>${score}</td>
          </tr>`;
        }).join("")}
    </tbody>
  </table>

  <h3>Tablica nakon ${round}. kola</h3>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Ekipa</th><th>UT</th><th>P</th><th>N</th><th>I</th>
        <th>G+</th><th>G-</th><th>GR</th><th>B</th>
      </tr>
    </thead>
    <tbody>
      ${(standings || [])
        .filter(s => s.league_code === lg.db)
        .sort((a,b)=>b.bodovi-a.bodovi || b.gr-a.gr)
        .map((s,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${esc(teamName.get(s.team_id)||"")}</td>
          <td>${s.ut}</td><td>${s.p}</td><td>${s.n}</td><td>${s.i}</td>
          <td>${s.gplus}</td><td>${s.gminus}</td><td>${s.gr}</td><td>${s.bodovi}</td>
        </tr>`).join("")}
    </tbody>
  </table>

  <h3>Iduće kolo (${round+1}. kolo)</h3>
  <table>
    <thead>
      <tr><th>Datum</th><th>Vrijeme</th><th>Domaćin</th><th>Gost</th></tr>
    </thead>
    <tbody>
      ${(nextFixtures || [])
        .filter(f => f.league_code === lg.db)
        .map(f=>`
        <tr>
          <td>${hrDate(f.match_date)}</td>
          <td>${hrTime(f.match_time)}</td>
          <td>${esc(teamName.get(f.home_team_id)||"")}</td>
          <td>${esc(teamName.get(f.away_team_id)||"")}</td>
        </tr>`).join("")}
    </tbody>
  </table>

  <div class="footer">panadic.vercel.app</div>
</div>
`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<style>
body {
  font-family: Arial, sans-serif;
  margin: 24px;
  color: #222;
}
h1 {
  text-align:center;
  color:#0A5E2A;
  margin-bottom:12px;
}
h2 {
  text-align:center;
  color:#0A5E2A;
  margin-top:24px;
}
h3 {
  color:#0A5E2A;
  margin:16px 0 6px;
}
table {
  width:100%;
  border-collapse:collapse;
  font-size:12px;
  margin-bottom:12px;
}
th, td {
  border-bottom:1px solid #ccc;
  padding:4px 6px;
  text-align:center;
}
th {
  background:#f2f2f2;
  font-weight:bold;
}
.league {
  page-break-after: always;
}
.league:last-child {
  page-break-after: auto;
}
.footer {
  text-align:center;
  margin-top:16px;
  font-size:11px;
  color:#F37C22;
}
</style>
</head>
<body>
<h1>Izvještaj nakon ${round}. kola</h1>
<div style="text-align:center;color:#F37C22;margin-bottom:16px;">
malonogometne lige Panadić 2025/26
</div>
${leaguesHtml}
</body>
</html>`;

    const { data: inserted, error } = await supabase
      .from("reports")
      .insert({ season: "2025/26", round, html })
      .select("id")
      .single();

    if (error) return new NextResponse("Greška pri spremanju", { status: 500 });
    return NextResponse.json(inserted);
  } catch (e) {
    console.error(e);
    return new NextResponse("Neočekivana greška", { status: 500 });
  }
}
