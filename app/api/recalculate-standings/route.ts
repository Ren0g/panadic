import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// ========================================================
// TIPOVI — obavezno!
// ========================================================

type FixtureRow = {
  id: number;
  home_team_id: number;
  away_team_id: number;
  league_code: string;
  group_code: string | null;
  phase: string | null;
};

type ResultRow = {
  fixture_id: number;
  home_goals: number;
  away_goals: number;
};

type TeamRow = {
  id: number;
  league_code: string;
  is_placeholder: boolean | null;
};

type TeamStats = {
  team_id: number;
  league_code: string;
  ut: number; 
  p: number;
  n: number;
  i: number;
  gplus: number;
  gminus: number;
  gr: number;
  bodovi: number;
  group_code: string | null;
  phase: string | null;
};

// ========================================================
// CENTRALNA FUNKCIJA
// ========================================================

async function recalc(fixtureId: number) {
  // 1) Fixture
  const { data: fixture, error: fxErr } = await supabase
    .from("fixtures")
    .select("id, home_team_id, away_team_id, league_code, group_code, phase")
    .eq("id", fixtureId)
    .single();

  if (fxErr || !fixture) {
    return { error: "Fixture nije pronađen.", status: 404 };
  }

  const leagueCode = fixture.league_code;

  // 2) Teams
  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("id, league_code, is_placeholder")
    .eq("league_code", leagueCode);

  if (tErr) return { error: "Greška pri čitanju timova.", status: 500 };

  const realTeams =
    (teams as TeamRow[] | null)?.filter((t) => !t.is_placeholder) ?? [];

  if (realTeams.length === 0) {
    await supabase.from("standings").delete().eq("league_code", leagueCode);
    return { ok: true, league_code: leagueCode, teamsUpdated: 0 };
  }

  // 3) Fixtures
  const { data: fixtures, error: fErr } = await supabase
    .from("fixtures")
    .select("id, home_team_id, away_team_id, league_code, group_code, phase")
    .eq("league_code", leagueCode);

  if (fErr) return { error: "Greška pri čitanju fixtures.", status: 500 };

  const allFixtures = fixtures as FixtureRow[];

  const fixtureIds = allFixtures.map((f) => f.id);

  // 4) Results
  const { data: results, error: rErr } = await supabase
    .from("results")
    .select("fixture_id, home_goals, away_goals")
    .in("fixture_id", fixtureIds);

  if (rErr) return { error: "Greška pri čitanju results.", status: 500 };

  const resultMap = new Map<number, ResultRow>();
  (results as ResultRow[]).forEach((r) => {
    resultMap.set(r.fixture_id, r);
  });

  // 5) Init stats
  const stats = new Map<number, TeamStats>();

  for (const t of realTeams) {
    stats.set(t.id, {
      team_id: t.id,
      league_code: leagueCode,
      ut: 0,
      p: 0,
      n: 0,
      i: 0,
      gplus: 0,
      gminus: 0,
      gr: 0,
      bodovi: 0,
      group_code: null,
      phase: null,
    });
  }

  // 6) Obrada svih rezultata
  for (const fx of allFixtures) {
    const res = resultMap.get(fx.id);
    if (!res) continue;

    const homeId = fx.home_team_id;
    const awayId = fx.away_team_id;

    const homeStats = stats.get(homeId);
    const awayStats = stats.get(awayId);
    if (!homeStats || !awayStats) continue;

    const hg = res.home_goals ?? 0;
    const ag = res.away_goals ?? 0;

    homeStats.ut++;
    awayStats.ut++;

    homeStats.gplus += hg;
    homeStats.gminus += ag;
    awayStats.gplus += ag;
    awayStats.gminus += hg;

    if (hg > ag) {
      homeStats.p++;
      awayStats.i++;
      homeStats.bodovi += 3;
    } else if (hg < ag) {
      awayStats.p++;
      homeStats.i++;
      awayStats.bodovi += 3;
    } else {
      homeStats.n++;
      awayStats.n++;
      homeStats.bodovi++;
      awayStats.bodovi++;
    }
  }

  // 7) Gol-razlika — SAFE
  for (const s of Array.from(stats.values())) {
    s.gr = s.gplus - s.gminus;
  }

  // 8) Brisanje + insert
  await supabase.from("standings").delete().eq("league_code", leagueCode);

  const rowsToInsert = Array.from(stats.values());

  if (rowsToInsert.length > 0) {
    const { error: insErr } = await supabase.from("standings").insert(rowsToInsert);
    if (insErr) return { error: "Greška pri upisu standings.", status: 500 };
  }

  return { ok: true, league_code: leagueCode, teamsUpdated: rowsToInsert.length };
}

// ========================================================
// GET (za browser)
// ========================================================

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fixtureId = Number(url.searchParams.get("fixtureId"));

  if (!fixtureId) {
    return NextResponse.json(
      { error: "fixtureId je obavezan i mora biti broj." },
      { status: 400 }
    );
  }

  const result = await recalc(fixtureId);
  return NextResponse.json(result);
}

// ========================================================
// POST (za backend pozive)
// ========================================================

export async function POST(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("fixtureId");

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const fixtureId = Number(body.fixtureId ?? query);

  if (!fixtureId) {
    return NextResponse.json(
      { error: "fixtureId je obavezan i mora biti broj." },
      { status: 400 }
    );
  }

  const result = await recalc(fixtureId);
  return NextResponse.json(result);
}
