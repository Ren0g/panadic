// app/api/reports/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import htmlToDocx from "html-to-docx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  const url = new URL(request.url);

  const print = url.searchParams.get("print") === "1";
  const word = url.searchParams.get("word") === "1";

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new NextResponse("Neispravan id", { status: 400 });
  }

  const { data, error } = await supabase
    .from("reports")
    .select("html, round")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Greška pri dohvaćanju izvještaja:", error);
    return new NextResponse("Izvještaj nije pronađen", { status: 404 });
  }

  let html: string = data.html;

  // --------------------------------------------------
  // WORD EXPORT (HTML → DOCX)
  // --------------------------------------------------
  if (word) {
    // Ukloni print skripte ako postoje
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

    const buffer = await htmlToDocx(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="izvjestaj_kolo_${data.round}.docx"`,
      },
    });
  }

  // --------------------------------------------------
  // PRINT (PDF)
  // --------------------------------------------------
  if (print) {
    const script =
      `<script>window.onload = function(){ window.print(); };</script>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${script}</body>`);
    } else {
      html += script;
    }
  }

  // --------------------------------------------------
  // NORMALNI HTML VIEW
  // --------------------------------------------------
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
