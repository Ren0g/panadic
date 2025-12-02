import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface UpdateFixtureBody {
  match_date?: string | null; // ISO (YYYY-MM-DD)
  match_time?: string | null; // HH:MM (24h)
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
    // ----------------- 1) UPDATE FIXTURE -----------------
    if (match_date !== undefined || match_time !== undefined) {
      const updateData: any = {};

      if (match_date !== undefined) updateData.match_date = match_date;
      if (match_time !== undefined) updateData.match_time = match_time;

      const { error: updateErr } = await supabaseAdmin
        .from('fixtures')
        .update(updateData)
        .eq('id', fixtureId);

      if (updateErr) {
        console.error('Error updating fixture', updateErr);
        return NextResponse.json(
          { error: 'Greška pri ažuriranju susreta.' },
          { status: 500 }
        );
      }
    }

    // ----------------- 2) UPSERT REZULTAT -----------------
    if (result) {
      const { home_goals, away_goals } = result;

      const { error: upsertErr } = await supabaseAdmin
        .from('results')
        .upsert(
          {
            fixture_id: fixtureId,
            home_goals,
            away_goals
          },
          { onConflict: 'fixture_id' }
        );

      if (upsertErr) {
        console.error('Error upserting result', upsertErr);
        return NextResponse.json(
          { error: 'Greška pri spremanju rezultata.' },
          { status: 500 }
        );
      }
    }

    // --------------- GOTOVO -----------------
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Exception:', err);
    return NextResponse.json(
      { error: 'Neočekivana greška.' },
      { status: 500 }
    );
  }
}
