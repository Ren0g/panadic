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
} from "docx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const dxa = (mm: number) => Math.round(mm * 56.7);

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

const hrTime = (t: string | null) => (t ? t.slice(0, 5) : "");

export async function GET() {
  const FINAL_LEAGUES = [
    { db: "PIONIRI_FINAL", label: "Pioniri" },
    { db: "MLPIONIRI_FINAL", label: "Mlađi pioniri" },
    { db: "PRSTICI_FINAL", label: "Prstići" },
    { db: "POC_GOLD_FINAL", label: "Početnici – Zlatna liga" },
    { db: "POC_SILVER_FINAL", label: "Početnici – Srebrna liga" },
  ];

  const { data: teams } = await supabase.from("teams").select("id,name");

  const teamName = new Map<number, string>();
  (teams || []).forEach(t => teamName.set(Number(t.id), t.name));

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(`
      id,
      league_code,
      match_time,
      placement_label,
      home_team_id,
      away_team_id,
      results:results!left (
        fixture_id,
        home_goals,
        away_goals
      )
    `)
    .like("league_code", "%_FINAL")
    .eq("match_date", "2026-02-21")
    .order("match_time");

  const sections = FINAL_LEAGUES.map(lg => {
    const leagueFixtures = (fixtures || []).filter(
      (f: any) => f.league_code === lg.db
    );

    if (!leagueFixtures.length) return null;

    const table = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(160), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [cellText("Plasman", true)] }),
            new TableCell({ children: [cellText("Vrijeme", true)] }),
            new TableCell({ children: [cellText("Domaćin", true)] }),
            new TableCell({ children: [cellText("Gost", true)] }),
            new TableCell({ children: [cellText("Rezultat", true)] }),
          ],
        }),
        ...leagueFixtures.map((f: any) => {
          const r =
            Array.isArray(f.results) && f.results.length > 0
              ? f.results[0]
              : null;

          const score =
            r && r.home_goals != null && r.away_goals != null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";

          return new TableRow({
            children: [
              new TableCell({
                children: [cellText(f.placement_label ?? "", false, "left")],
              }),
              new TableCell({
                children: [cellText(hrTime(f.match_time))],
              }),
              new TableCell({
                children: [cellText(teamName.get(f.home_team_id) || "", false, "left")],
              }),
              new TableCell({
                children: [cellText(teamName.get(f.away_team_id) || "", false, "left")],
              }),
              new TableCell({
                children: [cellText(score)],
              }),
            ],
          });
        }),
      ],
    });

    return {
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "panadic.vercel.app",
                  font: "Calibri",
                  size: 24,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "FINAL DAY – 21.02.2026.",
              bold: true,
              font: "Calibri",
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Malonogometna liga Panadić 2025/26",
              font: "Calibri",
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: lg.label,
              bold: true,
              font: "Calibri",
              size: 24,
            }),
          ],
        }),
        table,
      ],
    };
  }).filter(Boolean) as any[];

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="FINAL_DAY_2026.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
