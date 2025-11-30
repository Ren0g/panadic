import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import html_to_pdf from "html-pdf-node";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Format HH:MM
function shortTime(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export async function POST() {
  // 1) UČITAVAMO PODATKE
  const [{ data: teams }, { data: fixtures }, { data: standings }] =
    await Promise.all([
      supabase.from("teams").select("id,name"),
      supabase.from("fixtures").select(`
        id, league_code, round, match_date, match_time,
        home_team_id, away_team_id,
        results ( home_goals, away_goals )
      `),
      supabase.from("standings").select("*"),
    ]);

  if (!teams || !fixtures || !standings) {
    return new NextResponse("Greška pri učitavanju podataka", { status: 500 });
  }

  // mapa timova
  const teamName = new Map<number, string>();
  teams.forEach((t) => teamName.set(t.id, t.name));

  // određivanje zadnjeg kola
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

  const leagues = [
    { db: "PIONIRI_REG", title: "Pioniri" },
    { db: "MLPIONIRI_REG", title: "Mlađi pioniri" },
    { db: "PRSTICI_REG", title: "Prstići" },
    { db: "POC_REG_A", title: "Početnici A" },
    { db: "POC_REG_B", title: "Početnici B" },
    { db: "POC_GOLD", title: "Zlatna liga" },
    { db: "POC_SILVER", title: "Srebrna liga" },
  ];

  // 2) GENERIRAMO HTML
  let html = `
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; }
  h1 { text-align:center; margin-top:120px; font-size:38px; }
  h2 { margin-top:40px; color:#0A5E2A; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th {
    background:#FFE9D9;
    padding:6px;
    border:1px solid #ddd;
    color:#F37C22;
    font-weight:bold;
  }
  td {
    padding:6px;
    border:1px solid #ddd;
  }
  tr:nth-child(even) td {
    background:#FFF5ED;
  }
  footer {
    position:fixed;
    bottom:20px;
    width:100%;
    text-align:center;
    font-size:14px;
    color:#F37C22;
  }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<h1>Izvještaj nakon ${lastRound}. kola<br/>MN Liga Panadić 2025/26</h1>

<div class="page-break"></div>
`;

  for (const lg of leagues) {
    html += `<h2>${lg.title}</h2>`;

    // --- Rezultati ovog kola ---
    html += `<h3>Rezultati ${lastRound}. kola</h3>`;
    const fxRound = fixtures.filter(
      (f: any) => f.league_code === lg.db && f.round === lastRound
    );

    if (fxRound.length === 0) {
      html += `<p>Nema odigranih utakmica.</p>`;
    } else {
      html += `<table><tr>
        <th>Domaćin</th><th>Gost</th><th>Rezultat</th>
      </tr>`;

      fxRound.forEach((f: any) => {
        const r = f.results?.[0];
        const score =
          r && r.home_goals !== null && r.away_goals !== null
            ? `${r.home_goals}:${r.away_goals}`
            : "-:-";

        html += `<tr>
          <td>${teamName.get(f.home_team_id)}</td>
          <td>${teamName.get(f.away_team_id)}</td>
          <td style="text-align:center">${score}</td>
        </tr>`;
      });

      html += `</table>`;
    }

    // --- Tablica ---
    html += `<h3>Tablica nakon ${lastRound}. kola</h3>`;
    const st = standings
      .filter((s: any) => s.league_code === lg.db)
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

    if (st.length === 0) {
      html += `<p>Nema tablice za ovu ligu.</p>`;
    } else {
      html += `<table><tr>
        <th>R.br</th><th>Ekipa</th><th>UT</th><th>P</th>
        <th>N</th><th>I</th><th>G+</th><th>G-</th><th>GR</th><th>Bodovi</th>
      </tr>`;

      st.forEach((s: any, i: number) => {
        html += `<tr>
          <td>${i + 1}</td>
          <td>${s.name}</td>
          <td>${s.ut}</td>
          <td>${s.p}</td>
          <td>${s.n}</td>
          <td>${s.i}</td>
          <td>${s.gplus}</td>
          <td>${s.gminus}</td>
          <td>${s.gr}</td>
          <td>${s.bodovi}</td>
        </tr>`;
      });

      html += `</table>`;
    }

    // --- Sljedeće kolo ---
    html += `<h3>Iduće kolo (${nextRound}. kolo)</h3>`;
    const fxNext = fixtures.filter(
      (f: any) => f.league_code === lg.db && f.round === nextRound
    );

    if (fxNext.length === 0) {
      html += `<p>Nema rasporeda za iduće kolo.</p>`;
    } else {
      html += `<table><tr>
        <th>Datum</th><th>Vrijeme</th><th>Domaćin</th><th>Gost</th>
      </tr>`;

      fxNext.forEach((f: any) => {
        html += `<tr>
          <td>${f.match_date}</td>
          <td>${shortTime(f.match_time)}</td>
          <td>${teamName.get(f.home_team_id)}</td>
          <td>${teamName.get(f.away_team_id)}</td>
        </tr>`;
      });

      html += `</table>`;
    }

    html += `<div class="page-break"></div>`;
  }

  html += `<footer>panadic.vercel.app</footer></body></html>`;

  // 3) GENERIRAMO PDF
  const pdfBuffer = await html_to_pdf.generatePdf({ content: html }, { format: "A4" });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="izvjestaj_kolo_${lastRound}.pdf"`,
    },
  });
}
