import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import PDFDocument from "pdfkit";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // --- 1) Fetch all required data ---
  const { data: teams } = await supabase.from("teams").select("*");
  const { data: fixtures } = await supabase.from("fixtures").select("*");
  const { data: results } = await supabase.from("results").select("*");
  const { data: standings } = await supabase.from("standings").select("*");

  // --- 2) Map leagues ---
  const leagues = {
    PIONIRI_REG: "Pioniri",
    MLPIONIRI_REG: "Mlađi pioniri",
    PRSTICI_REG: "Prstići",
    POC_REG_A: "Početnici A",
    POC_REG_B: "Početnici B"
  };

  // --- 3) Create PDF in memory ---
  const font = readFileSync("/mnt/data/dejavu-sans.book.ttf");
  let buffers = [];
  const doc = new PDFDocument({ margin: 40 });

  doc.registerFont("DejaVu", font);
  doc.font("DejaVu");

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  // --- 4) ONE PAGE PER LEAGUE ---
  Object.entries(leagues).forEach(([code, name], i) => {
    if (i > 0) doc.addPage();
    doc.fontSize(22).text(name);
    doc.moveDown(1);

    // --- Rezultati 2. kola ---
    doc.fontSize(16).text("Rezultati 2. kola");
    doc.moveDown(0.5);

    const f2 = fixtures.filter(f => f.league_code === code && f.round === 2);
    f2.forEach(f => {
      const r = results.find(r => r.fixture_id === f.id);
      const home = teams.find(t => t.id === f.home_team_id)?.name;
      const away = teams.find(t => t.id === f.away_team_id)?.name;
      const res = r ? `${r.home_goals}:${r.away_goals}` : "-";
      doc.fontSize(12).text(`${home}  ${res}  ${away}`);
    });

    doc.moveDown(1);

    // --- Tablica nakon 2. kola ---
    doc.fontSize(16).text("Tablica nakon 2. kola");
    doc.moveDown(0.5);

    const st = standings.filter(s => s.league_code === code);
    st.forEach(s => {
      const t = teams.find(t => t.id === s.team_id)?.name;
      doc.fontSize(12).text(
        `${t}   UT:${s.ut}  P:${s.p}  N:${s.n}  I:${s.i}  G+${s.gplus}  G-${s.gminus}  GR:${s.gr}  Bodovi:${s.bodovi}`
      );
    });

    doc.moveDown(1);

    // --- Iduće kolo (3. kolo) ---
    doc.fontSize(16).text("Iduće kolo (3. kolo)");
    doc.moveDown(0.5);

    const f3 = fixtures.filter(f => f.league_code === code && f.round === 3);
    f3.forEach(f => {
      const home = teams.find(t => t.id === f.home_team_id)?.name;
      const away = teams.find(t => t.id === f.away_team_id)?.name;
      doc.fontSize(12).text(`${f.match_date} ${f.match_time}  ${home} - ${away}`);
    });

    doc.moveDown(2);
    doc.fontSize(10).fillColor("#555").text("panadic.vercel.app", {
      align: "center"
    });
    doc.fillColor("black");
  });

  doc.end();

  const pdf = Buffer.concat(buffers);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Izvjestaj_2_kolo.pdf"`
    }
  });
}
