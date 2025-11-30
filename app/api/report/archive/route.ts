import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  // 1) Dohvati HTML izvještaja
  const htmlRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/report?raw=1`);
  const html = await htmlRes.text();

  // 2) Ekstraktaj broj kola iz meta taga
  const match = html.match(/data-round="(\d+)"/);
  const round = match ? Number(match[1]) : null;

  if (!round) {
    return new NextResponse("Ne mogu odrediti broj kola.", { status: 500 });
  }

  // 3) Spremi u arhivu
  const { error } = await supabase
    .from("report_archive")
    .insert({ html, round });

  if (error) {
    console.error(error);
    return new NextResponse("Greška pri spremanju arhive.", { status: 500 });
  }

  return NextResponse.json({ success: true, round });
}
