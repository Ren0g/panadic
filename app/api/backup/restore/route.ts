// app/api/backup/restore/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type BackupPayload = {
  createdAt: string;
  version: number;
  data: {
    teams: any[];
    fixtures: any[];
    results: any[];
    standings: any[];
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const backupName = body.backupName as string | undefined;
    const mode = body.mode as "ALL" | "ONE_LEAGUE" | undefined;
    const leagueCode = body.leagueCode as string | undefined;

    if (!backupName) {
      return NextResponse.json(
        { error: "backupName je obavezan." },
        { status: 400 }
      );
    }

    if (!mode || (mode !== "ALL" && mode !== "ONE_LEAGUE")) {
      return NextResponse.json(
        { error: "mode mora biti 'ALL' ili 'ONE_LEAGUE'." },
        { status: 400 }
      );
    }

    if (mode === "ONE_LEAGUE" && !leagueCode) {
      return NextResponse.json(
        { error: "leagueCode je obavezan za ONE_LEAGUE." },
        { status: 400 }
      );
    }

    // 1) Download backupa
    const { data, error } = await supabase
      .storage
      .from("backups")
      .download(backupName);

    if (error || !data) {
      return NextResponse.json(
        { error: "Greška pri čitanju backup fajla.", details: error },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await data.arrayBuffer());
    const jsonStr = buf.toString("utf8");
    const payload = JSON.parse(jsonStr) as BackupPayload;

    const allTeams = payload.data.teams || [];
    const allFixtures = payload.data.fixtures || [];
    const allResults = payload.data.results || [];
    const allStandings = payload.data.standings || [];

    if (mode === "ALL") {
      // 2A) OBRIŠI SVE I VRATI TOČNO STANJE IZ BACKUPA
      await supabase.from("results").delete().neq("id", 0);
      await supabase.from("standings").delete().neq("team_id", 0);
      await supabase.from("fixtures").delete().neq("id", 0);
      await supabase.from("teams").delete().neq("id", 0);

      if (allTeams.length > 0) {
        await supabase.from("teams").insert(allTeams);
      }
      if (allFixtures.length > 0) {
        await supabase.from("fixtures").insert(allFixtures);
      }
      if (allResults.length > 0) {
        await supabase.from("results").insert(allResults);
      }
      if (allStandings.length > 0) {
        await supabase.from("standings").insert(allStandings);
      }

      return NextResponse.json({
        ok: true,
        mode: "ALL",
      });
    }

    // 2B) ONE_LEAGUE — brišemo samo tu ligu
    const league = leagueCode!;

    const leagueTeams = allTeams.filter(
      (t: any) => t.league_code === league
    );
    const leagueFixtures = allFixtures.filter(
      (f: any) => f.league_code === league
    );
    const fixtureIds = new Set(
      leagueFixtures.map((f: any) => f.id)
    );
    const leagueResults = allResults.filter((r: any) =>
      fixtureIds.has(r.fixture_id)
    );
    const leagueStandings = allStandings.filter(
      (s: any) => s.league_code === league
    );

    // 3) Obriši iz baze samo tu ligu
    if (fixtureIds.size > 0) {
      await supabase
        .from("results")
        .delete()
        .in("fixture_id", Array.from(fixtureIds));
    }

    await supabase.from("standings").delete().eq("league_code", league);
    await supabase.from("fixtures").delete().eq("league_code", league);
    await supabase.from("teams").delete().eq("league_code", league);

    // 4) Vrati snapshot za tu ligu
    if (leagueTeams.length > 0) {
      await supabase.from("teams").insert(leagueTeams);
    }
    if (leagueFixtures.length > 0) {
      await supabase.from("fixtures").insert(leagueFixtures);
    }
    if (leagueResults.length > 0) {
      await supabase.from("results").insert(leagueResults);
    }
    if (leagueStandings.length > 0) {
      await supabase.from("standings").insert(leagueStandings);
    }

    return NextResponse.json({
      ok: true,
      mode: "ONE_LEAGUE",
      leagueCode: league,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error.", details: String(e) },
      { status: 500 }
    );
  }
}
