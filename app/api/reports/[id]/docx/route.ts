import { NextResponse } from "next/server";
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
  PageBreak,
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

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const reportId = Number(params.id);
  if (!reportId) {
    return new NextResponse("Neispravan ID", { status: 400 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("round")
    .eq("id", reportId)
    .single();

  if (!report) {
    return new NextResponse("Izvještaj ne postoji", { status: 404 });
  }

  const round = report.round;

  const { data: teams } = await supabase.from("teams").select("id,name");
  const teamName = new Map<number, string>();
  (teams || []).forEach((t) => teamName.set(t.id, t.name));

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(`
      id,
      league_code,
      home_team_id,
      away_team_id,
      results:results!left ( home_goals, away_goals )
    `)
    .eq("round", round);

  const { data: standings } = await supabase
    .from("standings")
    .select("*");

  // -------------------------------------------------------
  // TABLE helper – JEDNA izmjena: equalCols
  // -------------------------------------------------------
  const table = (
    rows: string[][],
    header = false,
    equalCols: number[] = []
  ) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map((r, i) =>
        new TableRow({
          children: r.map((c, colIdx) =>
            new TableCell({
              width: equalCols.includes(colIdx)
                ? { size: 6, type: WidthType.PERCENTAGE }
                : undefined,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: c,
                      bold: header && i === 0,
                    }),
                  ],
                }),
              ],
            })
          ),
        })
      ),
    });

  const sections = LEAGUES.map((lg, idx) => {
    const fx = (fixtures || []).filter((f) => f.league_code === lg.db);
    const st = (standings || [])
      .filter((s) => s.league_code === lg.db)
      .sort((a, b) => b.bodovi - a.bodovi || b.gr - a.gr);

    const resultsTable = table(
      [
        ["Domaćin", "Gost", "Rezultat"],
        ...fx.map((f) => {
          const r = Array.isArray(f.results) ? f.results[0] : f.results;
          const score =
            r && r.home_goals != null && r.away_goals != null
              ? `${r.home_goals}:${r.away_goals}`
              : "-:-";
          return [
            teamName.get(f.home_team_id) || "",
            teamName.get(f.away_team_id) || "",
            score,
          ];
        }),
      ],
      true
    );

    const standingsTable = table(
      [
        ["R.br", "Ekipa", "UT", "P", "N", "I", "G+", "G-", "GR", "B"],
        ...st.map((s, i) => [
          String(i + 1),
          teamName.get(s.team_id) || "",
          String(s.ut),
          String(s.p),
          String(s.n),
          String(s.i),
          String(s.gplus),
          String(s.gminus),
          String(s.gr),
          String(s.bodovi),
        ]),
      ],
      true,
      [2, 3, 4, 5, 6, 7, 8, 9] // ⬅ JEDNAKE ŠIRINE
    );

    return {
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun("panadic.vercel.app")],
            }),
          ],
        }),
      },
      children: [
        ...(idx > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Izvještaj nakon ${round}. kola`,
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "malonogometne lige Panadić 2025/26",
              size: 22,
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
              size: 28,
            }),
          ],
        }),

        new Paragraph({
          children: [new TextRun({ text: `Rezultati ${round}. kola`, bold: true })],
        }),
        resultsTable,

        new Paragraph({}),
        new Paragraph({
          children: [
            new TextRun({ text: `Tablica nakon ${round}. kola`, bold: true }),
          ],
        }),
        standingsTable,
      ],
    };
  });

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="izvjestaj_kolo_${round}.docx"`,
    },
  });
}
