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

// SVE LIGE
const ALL_LEAGUES = [
  { db: "PRSTICI_REG", label: "Prstići" },
  { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
  { db: "PIONIRI_REG", label: "Pioniri" },
  { db: "POC_REG_A", label: "Početnici A" },
  { db: "POC_REG_B", label: "Početnici B" },
  { db: "POC_GOLD", label: "Zlatna liga" },
  { db: "POC_SILVER", label: "Srebrna liga" },
];

const dxa = (mm: number) => Math.round(mm * 56.7);

const cellText = (
  text: string,
  bold = false,
  align: "left" | "center" = "center"
) =>
  new Paragraph({
    alignment: align === "left" ? AlignmentType.LEFT : AlignmentType.CENTER,
    children: [
      new TextRun({ text, bold, size: 24, font: "Calibri" }),
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

  // 🔴 POSLOVNO PRAVILO
  // od 8. kola nadalje: A/B više NE POSTOJE
  const LEAGUES =
    round >= 8
      ? ALL_LEAGUES.filter(l =>
          l.db !== "POC_REG_A" && l.db !== "POC_REG_B"
        )
      : ALL_LEAGUES.filter(l =>
          l.db !== "POC_GOLD" && l.db !== "POC_SILVER"
        );

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name");

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

  const { data: standings } = await supabase
    .from("standings")
    .select("*");

  const sections = LEAGUES.map(lg => {
    const fx = (fixtures || []).filter(f => f.league_code === lg.db);
    if (!fx.length) return null;

    const nx = (nextFixtures || []).filter(f => f.league_code === lg.db);
    const st = (standings || [])
      .filter(s => s.league_code === lg.db)
      .sort((a, b) => b.bodovi - a.gr);

    return {
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "panadic.vercel.app",
                  size: 24,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `${round}. kolo`,
              bold: true,
              size: 24,
              font: "Calibri",
            }),
          ],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Malonogometna liga Panadić 2025/26",
              size: 24,
              font: "Calibri",
            }),
          ],
        }),

        new Paragraph({}),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: lg.label,
              bold: true,
              size: 24,
              font: "Calibri",
            }),
          ],
        }),

        new Paragraph({
          children: [new TextRun({ text: "Rezultati", bold: true, size: 24 })],
        }),

        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: dxa(100), type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [cellText("Domaćin", true)] }),
                new TableCell({ children: [cellText("Gost", true)] }),
                new TableCell({ children: [cellText("Rezultat", true)] }),
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
                  new TableCell({
                    children: [cellText(teamName.get(f.home_team_id) || "", false, "left")],
                  }),
                  new TableCell({
                    children: [cellText(teamName.get(f.away_team_id) || "", false, "left")],
                  }),
                  new TableCell({ children: [cellText(score)] }),
                ],
              });
            }),
          ],
        }),
      ],
    };
  }).filter(Boolean);

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
