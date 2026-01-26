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
    children: [new TextRun({ text, bold, size: 24 })],
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

  // 🔹 Rezultati ovog kola
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(`
      id, league_code, home_team_id, away_team_id,
      results:results!left ( home_goals, away_goals )
    `)
    .eq("round", round);

  // 🔹 Raspored sljedećeg kola
  const { data: nextFixtures } = await supabase
    .from("fixtures")
    .select(`
      league_code, match_date, match_time,
      home_team_id, away_team_id
    `)
    .eq("round", round + 1)
    .order("match_date")
    .order("match_time");

  // 🔹 Standings – uzimamo SAMO zadnje stanje po ligi
  const { data: allStandings } = await supabase.from("standings").select("*");

  const sections = LEAGUES.map(lg => {
    const fx = (fixtures || []).filter(f => f.league_code === lg.db);
    const nx = (nextFixtures || []).filter(f => f.league_code === lg.db);

    const leagueStandings = (allStandings || []).filter(
      s => s.league_code === lg.db
    );

    if (!leagueStandings.length && !fx.length && !nx.length) return null;

    const maxUt = Math.max(...leagueStandings.map(s => s.ut));

    const st = leagueStandings
      .filter(s => s.ut === maxUt)
      .sort((a, b) => b.bodovi - a.bodovi || b.gr - a.gr);

    const children = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${round}. kolo`, bold: true, size: 24 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Malonogometna liga Panadić 2025/26",
            size: 24,
          }),
        ],
      }),
      new Paragraph({}),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: lg.label, bold: true, size: 24 })],
      }),

      ...(fx.length ? [
        new Paragraph({}),
        new Paragraph({
          children: [new TextRun({ text: "Rezultati", bold: true, size: 24 })],
        }),
        new Table({
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
                  new TableCell({ children: [cellText(teamName.get(Number(f.home_team_id)) || "", false, "left")] }),
                  new TableCell({ children: [cellText(teamName.get(Number(f.away_team_id)) || "", false, "left")] }),
                  new TableCell({ children: [cellText(score)] }),
                ],
              });
            }),
          ],
        }),
      ] : []),

      ...(st.length ? [
        new Paragraph({}),
        new Paragraph({
          children: [new TextRun({ text: "Tablica", bold: true, size: 24 })],
        }),
        new Table({
          width: { size: dxa(165), type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [cellText("R.br", true)] }),
                new TableCell({ children: [cellText("Ekipa", true)] }),
                ...["UT","P","N","I","G+","G-","GR","Bod"].map(h =>
                  new TableCell({ children: [cellText(h, true)] })
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
        }),
      ] : []),

      ...(nx.length ? [
        new Paragraph({}),
        new Paragraph({
          children: [new TextRun({ text: `${round + 1}. kolo`, bold: true, size: 24 })],
        }),
        new Table({
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
        }),
      ] : []),
    ];

    return { children };
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
