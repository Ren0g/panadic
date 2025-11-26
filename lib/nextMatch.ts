import { supabase } from "./supabaseClient";

export type NextMatch = {
  id: string;
  round: string | null;
  match_date: string | null;
  match_time: string | null;
  home_team_name: string;
  away_team_name: string;
  isHome: boolean;
};

export async function getNextMatchForTeam(
  leagueCode: string,
  teamName: string
): Promise<NextMatch | null> {

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("name", teamName)
    .eq("league_code", leagueCode)
    .single();

  if (teamError || !team) {
    console.error("Team not found", teamError?.message);
    return null;
  }

  const teamId = team.id as string;
  const today = new Date().toISOString().slice(0, 10);

  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures")
    .select(
      `
      id,
      round,
      match_date,
      match_time_start,
      match_time_end,
      league_code,
      home_team_id,
      away_team_id,
      home:home_team_id ( name ),
      away:away_team_id ( name )
    `
    )
    .eq("league_code", leagueCode)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .gte("match_date", today);

  if (fixturesError) {
    console.error("Error loading next match", fixturesError.message);
    return null;
  }

  if (!fixtures || fixtures.length === 0) {
    return null;
  }

  const sorted = fixtures.sort((a: any, b: any) => {
    const d1 = new Date(a.match_date + "T" + (a.match_time_start || "00:00"));
    const d2 = new Date(b.match_date + "T" + (b.match_time_start || "00:00"));
    return d1.getTime() - d2.getTime();
  });

  const f = sorted[0];

  const isHome = f.home_team_id === teamId;

  const match_time =
    f.match_time_start && f.match_time_end
      ? `${f.match_time_start} - ${f.match_time_end}`
      : f.match_time_start || f.match_time_end || "";

  // >>> FIX ZA TYPESCRIPT <<<
  const homeRel = f.home as any;
  const awayRel = f.away as any;

  const homeName =
    Array.isArray(homeRel) ? homeRel[0]?.name : homeRel?.name;

  const awayName =
    Array.isArray(awayRel) ? awayRel[0]?.name : awayRel?.name;

  return {
    id: f.id,
    round: f.round,
    match_date: f.match_date,
    match_time,
    home_team_name: homeName ?? "",
    away_team_name: awayName ?? "",
    isHome,
  };
}
