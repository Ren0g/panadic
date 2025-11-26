import { supabase } from "./supabaseClient";

export type LeagueCode = "PIONIRI" | "MLADJI";

type TeamStats = {
  team_id: string;
  ut: number;
  p: number;
  n: number;
  i: number;
  gplus: number;
  gminus: number;
  gr: number;
  bodovi: number;
};

export async function recalculateStandings(leagueCode: LeagueCode) {
  // 1) Teams u toj ligi
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("league_code", leagueCode);

  if (teamsError || !teams) {
    console.error("Error loading teams", teamsError);
    return;
  }

  // 2) Fixtures u toj ligi
  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures")
    .select("id, home_team_id, away_team_id")
    .eq("league_code", leagueCode);

  if (fixturesError || !fixtures) {
    console.error("Error loading fixtures", fixturesError);
    return;
  }

  const fixtureIds = fixtures.map((f) => f.id);

  // 3) Rezultati SAMO za te fixture-e
  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select("fixture_id, home_goals, away_goals")
    .in("fixture_id", fixtureIds);

  if (resultsError) {
    console.error("Error loading results", resultsError);
    return;
  }

  const resultsByFixture: Record<
    string,
    { home_goals: number; away_goals: number }
  > = {};

  (results || []).forEach((r) => {
    resultsByFixture[r.fixture_id] = {
      home_goals: r.home_goals,
      away_goals: r.away_goals,
    };
  });

  // 4) Init statistike
  const stats: Record<string, TeamStats> = {};
  teams.forEach((t) => {
    stats[t.id] = {
      team_id: t.id,
      ut: 0,
      p: 0,
      n: 0,
      i: 0,
      gplus: 0,
      gminus: 0,
      gr: 0,
      bodovi: 0,
    };
  });

  // 5) Računaj po svim utakmicama
  fixtures.forEach((f) => {
    const r = resultsByFixture[f.id];
    if (!r) return;

    const home = stats[f.home_team_id];
    const away = stats[f.away_team_id];
    if (!home || !away) return;

    const hg = Number(r.home_goals) || 0;
    const ag = Number(r.away_goals) || 0;

    home.ut++;
    away.ut++;

    home.gplus += hg;
    home.gminus += ag;

    away.gplus += ag;
    away.gminus += hg;

    if (hg > ag) {
      home.p++;
      home.bodovi += 3;
      away.i++;
    } else if (hg < ag) {
      away.p++;
      away.bodovi += 3;
      home.i++;
    } else {
      home.n++;
      away.n++;
      home.bodovi++;
      away.bodovi++;
    }
  });

  // 6) Gol razlika
  Object.values(stats).forEach((s) => {
    s.gr = s.gplus - s.gminus;
  });

  // 7) Obriši stare standings za tu ligu
  const { error: delErr } = await supabase
    .from("standings")
    .delete()
    .eq("league_code", leagueCode);

  if (delErr) {
    console.error("Delete error", delErr);
    return;
  }

  // 8) Upis novih
  const rows = Object.values(stats).map((s) => ({
    league_code: leagueCode,
    ...s,
  }));

  const { error: insErr } = await supabase.from("standings").insert(rows);

  if (insErr) {
    console.error("Insert error", insErr);
  }

  console.log("Standings updated for", leagueCode);
}
