// app/api/reports/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  const url = new URL(request.url);
  const print = url.searchParams.get("print") === "1";

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new NextResponse("Neispravan id", { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("html, round")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Greška pri dohvaćanju izvještaja:", error);
    return new NextResponse("Izvještaj nije pronađen", { status: 404 });
  }

  let html: string = data.html;

  if (print) {
    const script =
      `<script>window.onload = function(){ window.print(); };</script>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${script}</body>`);
    } else {
      html += script;
    }
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
