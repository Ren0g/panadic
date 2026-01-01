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

// mm → DXA
const dxa = (mm: number) => Math.round(mm * 56.7);

// CENTRALNI TEXT HELPER — CALIBRI 12
const cellText = (text: string, bold = false) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text,
        bold,
        size: 24, // 12pt
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

    // ---------------- REZULTATI (UŽA TABLICA) ----------------
    const resultsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(120), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(45), type: WidthType.DXA }, children: [cellText("Domaćin", true)] }),
            new TableCell({ width: { size: dxa(45), type: WidthType.DXA }, children: [cellText("Gost", true)] }),
            new TableCell({ width: { size: dxa(30), type: WidthType.DXA }, children: [cellText("Rezultat", true)] }),
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
              new TableCell({ children: [cellText(teamName.get(f.home_team_id) || "")] }),
              new TableCell({ children: [cellText(teamName.get(f.away_team_id) || "")] }),
              new TableCell({ children: [cellText(score)] }),
            ],
          });
        }),
      ],
    });

    // ---------------- TABLICA (NAJŠIRA, B ZASIVLJEN) ----------------
    const standingsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(180), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(10), type: WidthType.DXA }, children: [cellText("R.br", true)] }),
            new TableCell({ width: { size: dxa(55), type: WidthType.DXA }, children: [cellText("Ekipa", true)] }),
            ...["UT","P","N","I","G+","G-","GR","B"].map(h =>
              new TableCell({
                width: { size: dxa(14), type: WidthType.DXA },
                shading: h === "B" ? { type: ShadingType.CLEAR, fill: "E6E6E6" } : undefined,
                children: [cellText(h, true)],
              })
            ),
          ],
        }),
        ...st.map((s, i) =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(String(i + 1))] }),
              new TableCell({ children: [cellText(teamName.get(s.team_id) || "")] }),
              ...[
                s.ut, s.p, s.n, s.i,
                s.gplus, s.gminus, s.gr, s.bodovi,
              ].map((v, idx) =>
                new TableCell({
                  shading: idx === 7 ? { type: ShadingType.CLEAR, fill: "E6E6E6" } : undefined,
                  children: [cellText(String(v))],
                })
              ),
            ],
          })
        ),
      ],
    });

    // ---------------- IDUĆE KOLO (SREDNJA ŠIRINA) ----------------
    const nextTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(150), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(30), type: WidthType.DXA }, children: [cellText("Datum", true)] }),
            new TableCell({ width: { size: dxa(25), type: WidthType.DXA }, children: [cellText("Vrijeme", true)] }),
            new TableCell({ width: { size: dxa(47), type: WidthType.DXA }, children: [cellText("Domaćin", true)] }),
            new TableCell({ width: { size: dxa(48), type: WidthType.DXA }, children: [cellText("Gost", true)] }),
          ],
        }),
        ...nx.map(f =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(f.match_date ? new Date(f.match_date).toLocaleDateString("hr-HR") : "")] }),
              new TableCell({ children: [cellText(f.match_time?.slice(0,5) || "")] }),
              new TableCell({ children: [cellText(teamName.get(f.home_team_id) || "")] }),
              new TableCell({ children: [cellText(teamName.get(f.away_team_id) || "")] }),
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
          children: [
            new TextRun({
              text: `Izvještaj nakon ${round}. kola`,
              bold: true,
              size: 32,
              font: "Calibri",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "malonogometne lige Panadić 2025/26", font: "Calibri" })],
        }),

        new Paragraph({}),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: lg.label, bold: true, size: 28, font: "Calibri" }),
          ],
        }),

        new Paragraph({ children: [new TextRun({ text: "Rezultati", bold: true, font: "Calibri" })] }),
        resultsTable,

        new Paragraph({}),
        new Paragraph({ children: [new TextRun({ text: "Tablica", bold: true, font: "Calibri" })] }),
        standingsTable,

        new Paragraph({}),
        new Paragraph({
          children: [
            new TextRun({
              text: `Iduće kolo (${round + 1}. kolo)`,
              bold: true,
              font: "Calibri",
            }),
          ],
        }),
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
