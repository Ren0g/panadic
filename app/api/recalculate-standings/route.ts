import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const queryFixtureId = url.searchParams.get("fixtureId");

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rawFixtureId = body.fixtureId ?? queryFixtureId;
    const fixtureId = Number(rawFixtureId);

    if (!fixtureId || !Number.isFinite(fixtureId)) {
      return NextResponse.json(
        { error: "fixtureId je obavezan i mora biti broj." },
        { status: 400 }
      );
    }

    // 1) Nađi fixture i ligu
    const { data: fixture, error: fxErr } = await supabase
      .from("fixtures")
      .select("id, home_team_id, away_team_id, league_code, group_code, phase")
      .eq("id", fixtureId)
      .single();

    if (fxErr || !fixture) {
      return NextResponse.json(
        { error: "Fixture nije pronađen.", details: fxErr },
        { status: 404 }
      );
    }

    const leagueCode = fixture.league_code as string;

    // 2) Učitaj sve timove te lige (bez placeholdera)
    const { data: teams, error: tErr } = await supabase
      .from("teams")
      .select("id, league_code, is_placeholder")
      .eq("league_code", leagueCode);

    if (tErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju timova.", details: tErr },
        { status: 500 }
      );
    }

    const realTeams = (teams as TeamRow[] | null)?.filter(
      (t) => !t.is_placeholder
    ) ?? [];

    if (realTeams.length === 0) {
      // Nema pravih timova → samo obriši standings za ligu
      await supabase
        .from("standings")
        .delete()
        .eq("league_code", leagueCode);

      return NextResponse.json({
        ok: true,
        league_code: leagueCode,
        teamsUpdated: 0,
      });
    }

    const teamIds = realTeams.map((t) => t.id);

    // 3) Učitaj sve fixture-e za tu ligu
    const { data: fixtures, error: fErr } = await supabase
      .from("fixtures")
      .select("id, home_team_id, away_team_id, league_code, group_code, phase")
      .eq("league_code", leagueCode);

    if (fErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju fixtures.", details: fErr },
        { status: 500 }
      );
    }

    const allFixtures = fixtures as FixtureRow[] | null;

    if (!allFixtures || allFixtures.length === 0) {
      // Nema fixture-a → standings za ligu = prazno
      await supabase
        .from("standings")
        .delete()
        .eq("league_code", leagueCode);

      return NextResponse.json({
        ok: true,
        league_code: leagueCode,
        teamsUpdated: 0,
      });
    }

    const fixtureIds = allFixtures.map((f) => f.id);

    // 4) Učitaj sve rezultate za te fixture-e
    const { data: results, error: rErr } = await supabase
      .from("results")
      .select("fixture_id, home_goals, away_goals")
      .in("fixture_id", fixtureIds);

    if (rErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju results.", details: rErr },
        { status: 500 }
      );
    }

    const allResults = (results as ResultRow[] | null) ?? [];

    // Ako nema rezultata → standings = 0 za sve timove
    const resultMap = new Map<number, ResultRow>();
    allResults.forEach((r) => {
      resultMap.set(r.fixture_id, r);
    });

    // 5) Inicijaliziraj stats za sve timove u ligi
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

    // 6) Prođi kroz sve fixture-e i rezultate
    for (const fx of allFixtures) {
      const res = resultMap.get(fx.id);
      if (!res) continue; // bez rezultata, preskoči

      const homeId = Number(fx.home_team_id);
      const awayId = Number(fx.away_team_id);

      const homeStats = stats.get(homeId);
      const awayStats = stats.get(awayId);

      // ignoriaraj fixture-e gdje tim nije "pravi" (placeholder ili druga liga)
      if (!homeStats || !awayStats) continue;

      // dodaj meta info (group_code, phase) ako još nije setirano
      if (!homeStats.group_code) homeStats.group_code = fx.group_code ?? null;
      if (!homeStats.phase) homeStats.phase = fx.phase ?? null;
      if (!awayStats.group_code) awayStats.group_code = fx.group_code ?? null;
      if (!awayStats.phase) awayStats.phase = fx.phase ?? null;

      const hg = res.home_goals ?? 0;
      const ag = res.away_goals ?? 0;

      // UT
      homeStats.ut += 1;
      awayStats.ut += 1;

      // golovi
      homeStats.gplus += hg;
      homeStats.gminus += ag;

      awayStats.gplus += ag;
      awayStats.gminus += hg;

      // pobjeda / neriješeno / poraz
      if (hg > ag) {
        homeStats.p += 1;
        awayStats.i += 1;
        homeStats.bodovi += 3;
      } else if (hg < ag) {
        awayStats.p += 1;
        homeStats.i += 1;
        awayStats.bodovi += 3;
      } else {
        homeStats.n += 1;
        awayStats.n += 1;
        homeStats.bodovi += 1;
        awayStats.bodovi += 1;
      }
    }

    // 7) Izračunaj GR
    for (const s of stats.values()) {
      s.gr = s.gplus - s.gminus;
    }

    // 8) Očisti standings za ligu i upiši nove
    await supabase
      .from("standings")
      .delete()
      .eq("league_code", leagueCode);

    const rowsToInsert = Array.from(stats.values());

    if (rowsToInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("standings")
        .insert(
          rowsToInsert.map((s) => ({
            team_id: s.team_id,
            league_code: s.league_code,
            ut: s.ut,
            p: s.p,
            n: s.n,
            i: s.i,
            gplus: s.gplus,
            gminus: s.gminus,
            gr: s.gr,
            bodovi: s.bodovi,
            group_code: s.group_code,
            phase: s.phase,
          }))
        );

      if (insErr) {
        return NextResponse.json(
          { error: "Greška pri upisu standings.", details: insErr },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      league_code: leagueCode,
      teamsUpdated: rowsToInsert.length,
    });
  } catch (e) {
    console.error("Recalculate standings error:", e);
    return NextResponse.json(
      { error: "Internal server error.", details: String(e) },
      { status: 500 }
    );
  }
}
