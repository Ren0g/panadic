export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Footer,
  TableLayoutType,
  ShadingType,
} from "docx";

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

const dxa = (mm: number) => Math.round(mm * 56.7);

// helper
const cell = (
  text: string,
  {
    bold = false,
    align = AlignmentType.CENTER,
  }: { bold?: boolean; align?: AlignmentType } = {}
) =>
  new Paragraph({
    alignment: align,
    children: [
      new TextRun({
        text,
        bold,
        size: 24,
        font: "Calibri",
      }),
    ],
  });

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const reportId = Number(params.id);
  if (!reportId) return new Response("Neispravan ID", { status: 400 });

  const { data: report } = await supabase
    .from("reports")
    .select("round")
    .eq("id", reportId)
    .single();

  if (!report) return new Response("Ne postoji izvještaj", { status: 404 });
  const round = report.round;

  const { data: teams } = await supabase.from("teams").select("id,name");
  const teamName = new Map<number, string>();
  (teams || []).forEach(t => teamName.set(t.id, t.name));

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(`
      league_code,
      home_team_id,
      away_team_id,
      results:results!left ( home_goals, away_goals )
    `)
    .eq("round", round);

  const { data: nextFixtures } = await supabase
    .from("fixtures")
    .select(`
      league_code, match_date, match_time,
      home_team_id, away_team_id
    `)
    .eq("round", round + 1)
    .order("match_date")
    .order("match_time");

  const { data: standings } = await supabase.from("standings").select("*");

  const sections = LEAGUES.map(lg => {
    const fx = (fixtures || []).filter(f => f.league_code === lg.db);
    const nx = (nextFixtures || []).filter(f => f.league_code === lg.db);
    const st = (standings || [])
      .filter(s => s.league_code === lg.db)
      .sort((a, b) => b.bodovi - a.bodovi || b.gr - a.gr);

    // -------- REZULTATI (UŽA, IMENA LIJEVO) --------
    const resultsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(110), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(42), type: WidthType.DXA }, children: [cell("Domaćin", { bold: true, align: AlignmentType.LEFT })] }),
            new TableCell({ width: { size: dxa(42), type: WidthType.DXA }, children: [cell("Gost", { bold: true, align: AlignmentType.LEFT })] }),
            new TableCell({ width: { size: dxa(26), type: WidthType.DXA }, children: [cell("Rezultat", { bold: true })] }),
          ],
        }),
        ...fx.map(f => {
          const r = Array.isArray(f.results) ? f.results[0] : f.results;
          const score =
            r && r.home_goals != null && r.away_goals != null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";
          return new TableRow({
            children: [
              new TableCell({ children: [cell(teamName.get(f.home_team_id) || "", { align: AlignmentType.LEFT })] }),
              new TableCell({ children: [cell(teamName.get(f.away_team_id) || "", { align: AlignmentType.LEFT })] }),
              new TableCell({ children: [cell(score)] }),
            ],
          });
        }),
      ],
    });

    // -------- TABLICA PORETKA --------
    const standingsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(180), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(10), type: WidthType.DXA }, children: [cell("R.br", { bold: true })] }),
            new TableCell({ width: { size: dxa(50), type: WidthType.DXA }, children: [cell("Ekipa", { bold: true, align: AlignmentType.LEFT })] }),

            ...["UT","P","N","I","G+","G-","GR"].map(h =>
              new TableCell({
                width: { size: dxa(13), type: WidthType.DXA },
                children: [cell(h, { bold: true })],
              })
            ),

            new TableCell({
              width: { size: dxa(20), type: WidthType.DXA }, // +50%
              shading: { type: ShadingType.CLEAR, fill: "E6E6E6" },
              children: [cell("Bod", { bold: true })],
            }),
          ],
        }),
        ...st.map((s, i) =>
          new TableRow({
            children: [
              new TableCell({ children: [cell(String(i + 1))] }),
              new TableCell({ children: [cell(teamName.get(s.team_id) || "", { align: AlignmentType.LEFT })] }),

              ...[
                s.ut, s.p, s.n, s.i,
                s.gplus, s.gminus, s.gr,
              ].map(v =>
                new TableCell({ children: [cell(String(v))] })
              ),

              new TableCell({
                shading: { type: ShadingType.CLEAR, fill: "E6E6E6" },
                children: [cell(String(s.bodovi))],
              }),
            ],
          })
        ),
      ],
    });

    // -------- IDUĆE KOLO (UŽE, IMENA LIJEVO) --------
    const nextTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(145), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(30), type: WidthType.DXA }, children: [cell("Datum", { bold: true })] }),
            new TableCell({ width: { size: dxa(25), type: WidthType.DXA }, children: [cell("Vrijeme", { bold: true })] }),
            new TableCell({ width: { size: dxa(45), type: WidthType.DXA }, children: [cell("Domaćin", { bold: true, align: AlignmentType.LEFT })] }),
            new TableCell({ width: { size: dxa(45), type: WidthType.DXA }, children: [cell("Gost", { bold: true, align: AlignmentType.LEFT })] }),
          ],
        }),
        ...nx.map(f =>
          new TableRow({
            children: [
              new TableCell({ children: [cell(f.match_date ? new Date(f.match_date).toLocaleDateString("hr-HR") : "")] }),
              new TableCell({ children: [cell(f.match_time?.slice(0,5) || "")] }),
              new TableCell({ children: [cell(teamName.get(f.home_team_id) || "", { align: AlignmentType.LEFT })] }),
              new TableCell({ children: [cell(teamName.get(f.away_team_id) || "", { align: AlignmentType.LEFT })] }),
            ],
          })
        ),
      ],
    });

    return {
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "panadic.vercel.app", font: "Calibri" })],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Izvještaj nakon ${round}. kola`, bold: true, size: 32, font: "Calibri" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "malonogometne lige Panadić 2025/26", font: "Calibri" })],
        }),

        new Paragraph({}),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: lg.label, bold: true, size: 28, font: "Calibri" })],
        }),

        new Paragraph({ children: [new TextRun({ text: "Rezultati", bold: true, font: "Calibri" })] }),
        resultsTable,

        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: "Tablica", bold: true, font: "Calibri" })] }),
        standingsTable,

        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: `Iduće kolo (${round + 1}. kolo)`, bold: true, font: "Calibri" })] }),
        nextTable,
      ],
    };
  });

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="izvjestaj_kolo_${round}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
