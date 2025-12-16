import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // VAŽNO: service role
);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("html, round")
      .eq("id", params.id)
      .single();

    if (error || !data?.html) {
      return new NextResponse("Izvještaj nije pronađen", { status: 404 });
    }

    // Word-friendly HTML wrapper
    const wordHtml = `
<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; }
</style>
</head>
<body>
${data.html}
</body>
</html>
`;

    return new NextResponse(wordHtml, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename=izvjestaj_kolo_${data.round}.doc`,
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Greška pri generiranju Word dokumenta", {
      status: 500,
    });
  }
}
