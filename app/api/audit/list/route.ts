import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: "Greška pri čitanju audit loga." }, { status: 500 });
    }

    return NextResponse.json({ logs: data });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error", details: String(e) },
      { status: 500 }
    );
  }
}
