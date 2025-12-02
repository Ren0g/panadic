import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface UpdateFixtureBody {
  match_date?: string | null; // ISO date string
  match_time?: string | null; // HH:MM
  result?: {
    home_goals: number | null;
    away_goals: number | null;
  } | null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const fixtureId = Number(params.id);

  if (Number.isNaN(fixtureId)) {
    return NextResponse.json(
      { error: 'Neispravan ID susreta.' },
      { status: 400 }
    );
  }

  let body: UpdateFixtureBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Neispravan JSON body.' },
      { status: 400 }
    );
  }

  const { match_date, match_time, result } = body;

  if (!match_date && !match_time && !result) {
    return NextResponse.json(
      { error: 'Nema podataka za ažuriranje.' },
      { status: 400 }
    );
  }

  try {
    // 1) Update fixtures (datum/vrijeme)
    if (match_date || match_time) {
      const updateData: Record<string, any> = {};
      if (match_date !== undefined) updateData.match_date = match_date;
      if (match_time !== undefined) updateData.match_time = match_time;

      const { error: updateFixtureError } = await supabaseAdmin
        .from('fixtures')
        .update(updateData)
        .eq('id', fixtureId);

      if (updateFixtureError) {
        console.error('Error updating fixture', updateFixtureError);
        return NextResponse.json(
          { error: 'Greška pri ažuriranju susreta.' },
          { status: 500 }
        );
      }
    }

    // 2) Upsert rezultat (results)
    if (result) {
      const { home_goals, away_goals } = result;

      const { error: upsertError } = await supabaseAdmin
        .from('results')
        .upsert(
          {
            fixture_id: fixtureId,
            home_goals,
            away_goals
          },
          { onConflict: 'fixture_id' }
        );

      if (upsertError) {
        console.error('Error upserting result', upsertError);
        return NextResponse.json(
          { error: 'Greška pri spremanju rezultata.' },
          { status: 500 }
        );
      }
    }

    // 3) Vrati OK – rekalkulacija standings ide preko frontenda pozivom
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Exception in PUT /api/admin/fixtures/[id]', err);
    return NextResponse.json(
      { error: 'Neočekivana greška.' },
      { status: 500 }
    );
  }
}
