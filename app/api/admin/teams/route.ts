import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const leagueCode = searchParams.get('leagueCode') || undefined;

  try {
    let query = supabaseAdmin
      .from('teams')
      .select('id, name, league_code')
      .order('name', { ascending: true })
      .limit(30);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (leagueCode) {
      query = query.eq('league_code', leagueCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching teams', error);
      return NextResponse.json(
        { error: 'Greška pri dohvaćanju klubova.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ teams: data ?? [] });
  } catch (err) {
    console.error('Exception in GET /api/admin/teams', err);
    return NextResponse.json(
      { error: 'Neočekivana greška.' },
      { status: 500 }
    );
  }
}
