// app/api/backup/download/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Parametar 'name' je obavezan." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .storage
    .from("backups")
    .download(name);

  if (error || !data) {
    return NextResponse.json(
      { error: "Greška pri downloadu backupa.", details: error },
      { status: 500 }
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
