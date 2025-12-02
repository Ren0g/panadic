import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const leagueCode = searchParams.get('leagueCode') || undefined;
  const roundParam = searchParams.get('round');
  const teamIdParam = searchParams.get('teamId');

  const round = roundParam ? Number(roundParam) : undefined;
  const teamId = teamIdParam ? Number(teamIdParam) : undefined;

  if (Number.isNaN(round)) {
    return NextResponse.json(
      { error: 'round mora biti broj.' },
      { status: 400 }
    );
  }

  if (Number.isNaN(teamId)) {
    return NextResponse.json(
      { error: 'teamId mora biti broj.' },
      { status: 400 }
    );
  }

  try {
    let query = supabaseAdmin
      .from('fixtures')
      .select(
        `
        id,
        league_code,
        round,
        match_date,
        match_time,
        home_team_id,
        away_team_id,
        home:home_team_id ( id, name ),
        away:away_team_id ( id, name ),
        result:results ( id, home_goals, away_goals )
      `
      )
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    if (leagueCode) {
      query = query.eq('league_code', leagueCode);
    }

    if (typeof round === 'number') {
      query = query.eq('round', round);
    }

    if (typeof teamId === 'number') {
      // home ili away jednak odabranom timu
      query = query.or(
        `home_team_id.eq.${teamId},away_team_id.eq.${teamId}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fixtures', error);
      return NextResponse.json(
        { error: 'Greška pri dohvaćanju susreta.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ fixtures: data ?? [] });
  } catch (err) {
    console.error('Exception in GET /api/admin/fixtures', err);
    return NextResponse.json(
      { error: 'Neočekivana greška.' },
      { status: 500 }
    );
  }
}
