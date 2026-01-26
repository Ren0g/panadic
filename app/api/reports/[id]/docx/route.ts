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
  { db: "PRSTICI_REG", label: "Prstići" },
  { db: "MLPIONIRI_REG", label: "Mlađi pioniri" },
  { db: "PIONIRI_REG", label: "Pioniri" },
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
  (teams || []).forEach(t => teamName.set(Number(t.id), t.name));

  // 🔹 REZULTATI – SAD IZ VIEW-a
  const { data: fixtures } = await supabase
    .from("report_results")
    .select("*")
    .eq("round", round);

  // 🔹 IDUĆE KOLO – SAD IZ VIEW-a
  const { data: nextFixtures } = await supabase
    .from("report_next_fixtures")
    .select("*")
    .eq("round", round + 1)
    .order("match_date")
    .order("match_time");

  // 🔹 TABLICE – SAD IZ VIEW-a
  const { data: standings } = await supabase
    .from("report_standings")
    .select("*");

  const sections = LEAGUES.map(lg => {
    const fx = (fixtures || []).filter(f => f.league_code === lg.db);
    const nx = (nextFixtures || []).filter(f => f.league_code === lg.db);
    const st = (standings || [])
      .filter(s => s.league_code === lg.db)
      .sort((a, b) => b.bodovi - a.bodovi || b.gr - a.gr);

    if (!fx.length && !st.length && !nx.length) return null;

    const resultsTable = new Table({
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
          const score =
            f.home_goals != null && f.away_goals != null
              ? `${f.home_goals}:${f.away_goals}`
              : "-:-";
          return new TableRow({
            children: [
              new TableCell({ children: [cellText(teamName.get(Number(f.home_team_id)) || "", false, "left")] }),
              new TableCell({ children: [cellText(teamName.get(Number(f.away_team_id)) || "", false, "left")] }),
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
              new TableCell({ children: [cellText(teamName.get(Number(s.team_id)) || "", false, "left")] }),
              ...[s.ut, s.p, s.n, s.i, s.gplus, s.gminus, s.gr, s.bodovi]
                .map(v => new TableCell({ children: [cellText(String(v))] })),
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
              new TableCell({ children: [cellText(f.match_date ?? "")] }),
              new TableCell({ children: [cellText(f.match_time ?? "")] }),
              new TableCell({ children: [cellText(teamName.get(Number(f.home_team_id)) || "", false, "left")] }),
              new TableCell({ children: [cellText(teamName.get(Number(f.away_team_id)) || "", false, "left")] }),
            ],
          })
        ),
      ],
    });

    return {
      children: [
        new Paragraph({ children: [new TextRun({ text: `${round}. kolo`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: lg.label, bold: true, size: 24 })] }),
        resultsTable,
        new Paragraph({}),
        standingsTable,
        new Paragraph({}),
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
