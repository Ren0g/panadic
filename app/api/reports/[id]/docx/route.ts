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

// mm → DXA
const dxa = (mm: number) => Math.round(mm * 56.7);

// Calibri 12 – bez razmaka u ćeliji
const cellText = (
  text: string,
  bold = false,
  align: "left" | "center" = "center"
) =>
  new Paragraph({
    alignment: align === "left" ? AlignmentType.LEFT : AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [
      new TextRun({
        text: text ?? "",
        bold,
        size: 24,
        font: "Calibri",
      }),
    ],
  });

const hrDate = (d: string | null) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}.`;
};

const hrTime = (t: string | null) => (t ? t.slice(0, 5) : "");

const getResult = (fixture: any) => {
  if (!fixture?.results) return null;
  if (!Array.isArray(fixture.results)) return fixture.results;
  return fixture.results.find((r: any) => r.fixture_id === fixture.id) || null;
};

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

  const round: number = Number(report.round);

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
  (teams || []).forEach(t => teamName.set(Number(t.id), t.name));

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

  const { data: nextFixtures } = await supabase
    .from("fixtures")
    .select(`
      league_code,
      round,
      match_date,
      match_time,
      home_team_id,
      away_team_id
    `)
    .eq("round", round + 1)
    .order("match_date")
    .order("match_time");

  // 🔴 KLJUČNA PROMJENA – LIVE VIEW
  const { data: standings } = await supabase
    .from("report_standings_live")
    .select("*");

  const sections = LEAGUES.map(lg => {
    const fx = (fixtures || []).filter((f: any) => f.league_code === lg.db);
    const nx = (nextFixtures || []).filter((f: any) => f.league_code === lg.db);
    const st = (standings || [])
      .filter((s: any) => s.league_code === lg.db)
      .sort((a: any, b: any) => b.bodovi - a.bodovi || b.gr - a.gr);

    if (!fx.length && !st.length && !nx.length) return null;

    const resultsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(100), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(35), type: WidthType.DXA }, children: [cellText("Domaćin", true)] }),
            new TableCell({ width: { size: dxa(35), type: WidthType.DXA }, children: [cellText("Gost", true)] }),
            new TableCell({ width: { size: dxa(30), type: WidthType.DXA }, children: [cellText("Rezultat", true)] }),
          ],
        }),
        ...fx.map((f: any) => {
          const r = getResult(f);
          const score =
            r && r.home_goals != null && r.away_goals != null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";

          return new TableRow({
            children: [
              new TableCell({ children: [cellText(teamName.get(f.home_team_id) || "", false, "left")] }),
              new TableCell({ children: [cellText(teamName.get(f.away_team_id) || "", false, "left")] }),
              new TableCell({ children: [cellText(score)] }),
            ],
          });
        }),
      ],
    });

    const standingsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(165), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: dxa(8), type: WidthType.DXA }, children: [cellText("R.br", true)] }),
            new TableCell({ width: { size: dxa(30), type: WidthType.DXA }, children: [cellText("Ekipa", true)] }),
            ...["UT","P","N","I","G+","G-","GR","Bod"].map(h =>
              new TableCell({
                width: { size: h === "Bod" ? dxa(16) : dxa(10), type: WidthType.DXA },
                shading: h === "Bod" ? { type: ShadingType.CLEAR, fill: "E6E6E6" } : undefined,
                children: [cellText(h, true)],
              })
            ),
          ],
        }),
        ...st.map((s: any, i: number) =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(String(i + 1))] }),
              new TableCell({ children: [cellText(teamName.get(s.team_id) || "", false, "left")] }),
              ...[s.ut, s.p, s.n, s.i, s.gplus, s.gminus, s.gr, s.bodovi].map((v: any, idx: number) =>
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

    const nextTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(135), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [cellText("Datum", true)] }),
            new TableCell({ children: [cellText("Vrijeme", true)] }),
            new TableCell({ children: [cellText("Domaćin", true)] }),
            new TableCell({ children: [cellText("Gost", true)] }),
          ],
        }),
        ...nx.map((f: any) =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(hrDate(f.match_date))] }),
              new TableCell({ children: [cellText(hrTime(f.match_time))] }),
              new TableCell({ children: [cellText(teamName.get(f.home_team_id) || "", false, "left")] }),
              new TableCell({ children: [cellText(teamName.get(f.away_team_id) || "", false, "left")] }),
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
              children: [new TextRun({ text: "panadic.vercel.app", font: "Calibri", size: 24 })],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `Izvještaj nakon ${round}. kola`, bold: true, font: "Calibri", size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Malonogometna liga Panadić 2025/26", font: "Calibri", size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: lg.label, bold: true, font: "Calibri", size: 24 })],
        }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Rezultati", bold: true, font: "Calibri", size: 24 })] }),
        resultsTable,
        new Paragraph({ spacing: { after: 200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Tablica", bold: true, font: "Calibri", size: 24 })],
        }),
        standingsTable,
        new Paragraph({ spacing: { after: 200 } }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: `Iduće kolo (${round + 1}. kolo)`, bold: true, font: "Calibri", size: 24 })],
        }),
        nextTable,
      ],
    };
  }).filter(Boolean) as any[];

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
