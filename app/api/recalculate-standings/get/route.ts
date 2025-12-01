import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fixtureId = url.searchParams.get("fixtureId");

  if (!fixtureId) {
    return NextResponse.json(
      { error: "Nedostaje fixtureId parametar." },
      { status: 400 }
    );
  }

  try {
    // Poziv originalnog POST endpointa
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://panadic.vercel.app"}/api/recalculate-standings?fixtureId=${fixtureId}`,
      {
        method: "POST",
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Greška pri pozivu POST endpointa.", details: String(e) },
      { status: 500 }
    );
  }
}
