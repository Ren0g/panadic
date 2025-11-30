export const dynamic = "force-dynamic";

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

function shortTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function esc(str: string | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET() {
  const [{ data: teams }, { data: fixtures }, { data: standings }] =
    await Promise.all([
      supabase.from("teams").select("id,name"),
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

  if (!teams || !fixtures || !standings) {
    return new NextResponse("Greška pri dohvaćanju podataka.", { status: 500 });
  }

  const teamName = new Map<number, string>();
  teams.forEach((t) => teamName.set(t.id, t.name));

  // zadnje odigrano kolo
  const played = fixtures.filter(
    (f: any) =>
      f.results &&
      f.results.length &&
      f.results[0].home_goals !== null &&
      f.results[0].away_goals !== null
  );

  let lastRound = 0;
  played.forEach((f: any) => {
    if (f.round > lastRound) lastRound = f.round;
  });

  if (lastRound === 0) lastRound = 1;
  const nextRound = lastRound + 1;

  // HTML builder
  let html = `
<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="utf-8" />
<title>Izvještaj ${lastRound}. kolo — Panadić 2025/26</title>

<style>
  body {
    font-family: Arial, sans-serif;
    margin: 40px;
    color: #111;
  }
  h1 {
    text-align: center;
    color: #0A5E2A;
    margin-bottom: 0;
    font-size: 38px;
  }
  h2 {
    text-align: center;
    color: #0A5E2A;
    margin-top: 60px;
    margin-bottom: 10px;
    font-size: 28px;
  }
  h3 {
    color: #0A5E2A;
    margin-top: 25px;
    margin-bottom: 8px;
    font-size: 20px;
  }
  p.subtitle {
    text-align: center;
    color: #F37C22;
    margin-top: 8px;
    font-size: 16px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    margin-bottom: 22px;
  }
  th {
    background: #FFF0E6;
    color: #F37C22;
    font-weight: bold;
    padding: 6px;
    border: 1px solid #e7d7c7;
  }
  td {
    padding: 6px;
    border: 1px solid #e7d7c7;
  }
  tr:nth-child(even) td {
    background: #FFF8F2;
  }

  .center { text-align: center; }
  .left { text-align: left; }

  .page-break {
    page-break-after: always;
  }

  footer {
    margin-top: 60px;
    text-align: center;
    color: #F37C22;
    font-size: 14px;
  }
</style>
</head>
<body>

<h1>Izvještaj nakon ${lastRound}. kola</h1>
<p class="subtitle">malonogometne lige Panadić 2025/26</p>
<p class="subtitle">Automatski generiran iz aplikacije panadic.vercel.app</p>

`;

  // helper funkcije
  function tableResults(league: string) {
    const fx = fixtures.filter(
      (f: any) => f.league_code === league && f.round === lastRound
    );

    if (fx.length === 0) return "<p>Nema odigranih utakmica u ovom kolu.</p>";

    return `
<table>
  <thead>
    <tr>
      <th>Domaćin</th>
      <th>Gost</th>
      <th class="center">Rezultat</th>
    </tr>
  </thead>
  <tbody>
    ${fx
      .map((f: any) => {
        const res = f.results?.[0];
        const score =
          res?.home_goals !== null && res?.away_goals !== null
            ? `${res.home_goals}:${res.away_goals}`
            : "-:-";

        return `
      <tr>
        <td class="left">${esc(teamName.get(f.home_team_id))}</td>
        <td class="left">${esc(teamName.get(f.away_team_id))}</td>
        <td class="center">${score}</td>
      </tr>`;
      })
      .join("")}
  </tbody>
</table>`;
  }

  function tableStandings(league: string) {
    const st = standings
      .filter((s: any) => s.league_code === league)
      .map((s: any) => ({
        ...s,
        name: teamName.get(s.team_id),
      }))
      .sort((a: any, b: any) => {
        if (b.bodovi !== a.bodovi) return b.bodovi - a.bodovi;
        if (b.gr !== a.gr) return b.gr - a.gr;
        if (b.gplus !== a.gplus) return b.gplus - a.gplus;
        return a.name.localeCompare(b.name);
      });

    if (st.length === 0) return "<p>Nema tablice za ovu ligu.</p>";

    return `
<table>
  <thead>
    <tr>
      <th class="center">R.br</th>
      <th>Ekipa</th>
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
  <tbody>
    ${st
      .map(
        (s: any, i: number) => `
      <tr>
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
    `
      )
      .join("")}
  </tbody>
</table>`;
  }

  function tableNextRound(league: string) {
    const fx = fixtures.filter(
      (f: any) => f.league_code === league && f.round === nextRound
    );

    if (fx.length === 0) return "<p>Nema rasporeda za iduće kolo.</p>";

    return `
<table>
  <thead>
    <tr>
      <th>Datum</th>
      <th class="center">Vrijeme</th>
      <th>Domaćin</th>
      <th>Gost</th>
    </tr>
  </thead>
  <tbody>
    ${fx
      .map(
        (f: any) => `
      <tr>
        <td>${esc(f.match_date)}</td>
        <td class="center">${esc(shortTime(f.match_time))}</td>
        <td class="left">${esc(teamName.get(f.home_team_id))}</td>
        <td class="left">${esc(teamName.get(f.away_team_id))}</td>
      </tr>
    `
      )
      .join("")}
  </tbody>
</table>`;
  }

  // sadrzaj po ligama
  for (const lg of LEAGUES) {
    html += `
<div class="page-break"></div>

<h2>${esc(lg.label)}</h2>

<h3>Rezultati ${lastRound}. kola</h3>
${tableResults(lg.db)}

<h3>Tablica nakon ${lastRound}. kola</h3>
${tableStandings(lg.db)}

<h3>Iduće kolo (${nextRound}. kolo)</h3>
${tableNextRound(lg.db)}
`;
  }

  html += `
<footer>panadic.vercel.app</footer>
</body>
</html>
`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
