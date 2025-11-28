// app/api/backup/delete/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const backupName = body.backupName as string | undefined;

    if (!backupName) {
      return NextResponse.json(
        { error: "backupName je obavezan." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .storage
      .from("backups")
      .remove([{ name: backupName }]);

    if (error) {
      return NextResponse.json(
        { error: "Greška pri brisanju backupa.", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error.", details: String(e) },
      { status: 500 }
    );
  }
}
