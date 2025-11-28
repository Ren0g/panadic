// app/api/backup/create/route.ts
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

export async function POST() {
  try {
    // 1) Učitaj sve tablice
    const { data: teams, error: tErr } = await supabase
      .from("teams")
      .select("*");

    if (tErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju teams.", details: tErr },
        { status: 500 }
      );
    }

    const { data: fixtures, error: fErr } = await supabase
      .from("fixtures")
      .select("*");

    if (fErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju fixtures.", details: fErr },
        { status: 500 }
      );
    }

    const { data: results, error: rErr } = await supabase
      .from("results")
      .select("*");

    if (rErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju results.", details: rErr },
        { status: 500 }
      );
    }

    const { data: standings, error: sErr } = await supabase
      .from("standings")
      .select("*");

    if (sErr) {
      return NextResponse.json(
        { error: "Greška pri čitanju standings.", details: sErr },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    const payload: BackupPayload = {
      createdAt: now,
      version: 1,
      data: {
        teams: teams || [],
        fixtures: fixtures || [],
        results: results || [],
        standings: standings || [],
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);

    const safeName = `backup-${now.replace(/[:.]/g, "-")}.json`;

    const { error: upErr } = await supabase
      .storage
      .from("backups")
      .upload(safeName, jsonString, {
        contentType: "application/json",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json(
        { error: "Greška pri spremanju backupa u storage.", details: upErr },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      backupName: safeName,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error.", details: String(e) },
      { status: 500 }
    );
  }
}
