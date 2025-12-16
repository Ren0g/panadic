import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // ⛔️ NIKAD ne koristi client supabase u API ruti
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("reports")
    .select("html, round")
    .eq("id", params.id)
    .single();

  if (error || !data?.html) {
    return new NextResponse("Izvještaj nije pronađen.", { status: 404 });
  }

  const filename = `izvjestaj_kolo_${data.round}.doc`;

  // ⚠️ Word savršeno otvara HTML ako je Content-Type ispravan
  return new NextResponse(data.html, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
