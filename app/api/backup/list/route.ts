// app/api/backup/list/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .storage
      .from("backups")
      .list("", {
        limit: 100
      });

    if (error) {
      return NextResponse.json(
        { error: "Greška pri čitanju backup liste.", details: error },
        { status: 500 }
      );
    }

    const backups =
      (data || [])
        .map((item: any) => ({
          name: item.name,
          createdAt: item.created_at,
          size: item.metadata?.size,
        }))
        .sort((a, b) => {
          const da = new Date(a.createdAt).getTime();
          const db = new Date(b.createdAt).getTime();
          return db - da;
        });

    return NextResponse.json({ backups });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error.", details: String(e) },
      { status: 500 }
    );
  }
}
