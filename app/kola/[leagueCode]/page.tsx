import AllRoundsClient from "./client";

export default function AllRoundsPage({
  params,
}: {
  params: { leagueCode: string };
}) {
  // ruta /kola/pioniri -> "PIONIRI"
  const code = (params.leagueCode || "").toUpperCase();

  return <AllRoundsClient leagueCode={code} />;
}
