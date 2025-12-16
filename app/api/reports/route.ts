// app/api/reports/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET -> lista svih izvještaja (id, season, round, created_at)
export async function GET() {
  const { data, error } = await supabase
    .from("reports")
    .select("id, season, round, created_at")
    .order("season", { ascending: false })
    .order("round", { ascending: false });

  if (error) {
    console.error("Greška pri dohvaćanju reports:", error);
    return new NextResponse("Greška pri dohvaćanju arhive", { status: 500 });
  }

  return NextResponse.json(data || []);
}

// DELETE -> ?id=123
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  if (!idParam) {
    return new NextResponse("Nedostaje id", { status: 400 });
  }

  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return new NextResponse("Neispravan id", { status: 400 });
  }

  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) {
    console.error("Greška pri brisanju izvještaja:", error);
    return new NextResponse("Greška pri brisanju", { status: 500 });
  }

  return NextResponse.json({ success: true });
}
