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
    spacing: { before: 0, after: 0 },
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

  // teams
  const { data: teams } = await supabase.from("teams").select("id,name");
  const teamName = new Map<number, string>();
  (teams || []).forEach(t => teamName.set(Number(t.id), t.name));

  // SVI rezultati (bez filtriranja po kolu)
  const { data: results } = await supabase
    .from("report_results")
    .select("*")
    .order("league_code")
    .order("round")
    .order("match_time");

  // izračun zadnjeg kola PO LIGI
  const lastRoundByLeague = new Map<string, number>();
  (results || []).forEach(r => {
    const prev = lastRoundByLeague.get(r.league_code) || 0;
    if (r.round > prev) lastRoundByLeague.set(r.league_code, r.round);
  });

  // iduće utakmice (sve, filtriramo kasnije)
  const { data: nextFixtures } = await supabase
    .from("report_next_fixtures")
    .select("*")
    .order("league_code")
    .order("match_date")
    .order("match_time");

  const { data: standings } = await supabase
    .from("report_standings")
    .select("*");

  const sections = LEAGUES.map(lg => {
    const leagueRound = lastRoundByLeague.get(lg.db);

    const fx = leagueRound
      ? (results || []).filter(
          r => r.league_code === lg.db && r.round === leagueRound
        )
      : [];

    const nx = leagueRound
      ? (nextFixtures || []).filter(
          f => f.league_code === lg.db && f.round === leagueRound + 1
        )
      : [];

    const st = (standings || [])
      .filter(s => s.league_code === lg.db)
      .sort((a, b) => {
        if (b.bodovi !== a.bodovi) return b.bodovi - a.bodovi;
        if (b.gr !== a.gr) return b.gr - a.gr;
        if (b.gplus !== a.gplus) return b.gplus - a.gplus;
        return (teamName.get(a.team_id) || "").localeCompare(
          teamName.get(b.team_id) || "",
          "hr"
        );
      });

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
        ...fx.map(f =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(teamName.get(f.home_team_id) || "", false, "left")] }),
              new TableCell({ children: [cellText(teamName.get(f.away_team_id) || "", false, "left")] }),
              new TableCell({ children: [cellText(`${f.home_goals}:${f.away_goals}`)] }),
            ],
          })
        ),
      ],
    });

    const standingsTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: dxa(165), type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [cellText("R.br", true)] }),
            new TableCell({ children: [cellText("Ekipa", true)] }),
            ...["UT","P","N","I","G+","G-","GR","Bod"].map(h =>
              new TableCell({
                shading: h === "Bod" ? { type: ShadingType.CLEAR, fill: "E6E6E6" } : undefined,
                children: [cellText(h, true)],
              })
            ),
          ],
        }),
        ...st.map((s, i) =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(String(i + 1))] }),
              new TableCell({ children: [cellText(teamName.get(s.team_id) || "", false, "left")] }),
              ...[s.ut, s.p, s.n, s.i, s.gplus, s.gminus, s.gr, s.bodovi].map(v =>
                new TableCell({ children: [cellText(String(v))] })
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
        ...nx.map(f =>
          new TableRow({
            children: [
              new TableCell({ children: [cellText(new Date(f.match_date).toLocaleDateString("hr-HR"))] }),
              new TableCell({ children: [cellText(f.match_time?.slice(0,5) || "")] }),
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
          children: [new TextRun({ text: `${leagueRound ?? ""}. kolo`, bold: true, font: "Calibri", size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Malonogometna liga Panadić 2025/26", font: "Calibri", size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: lg.label, bold: true, font: "Calibri", size: 24 })],
        }),
        new Paragraph({ children: [new TextRun({ text: "Rezultati", bold: true, font: "Calibri", size: 24 })] }),
        resultsTable,
        new Paragraph({}),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Tablica", bold: true, font: "Calibri", size: 24 })],
        }),
        standingsTable,
        new Paragraph({}),
        new Paragraph({
          children: [new TextRun({ text: `${(leagueRound ?? 0) + 1}. kolo`, bold: true, font: "Calibri", size: 24 })],
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
      "Content-Disposition": `attachment; filename="izvjestaj.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
