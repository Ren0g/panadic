import AllRoundsClient from "./client";

export default function Page({ params }: { params: { league: string } }) {
  const code = (params.league || "").toUpperCase();
  return <AllRoundsClient leagueCode={code} />;
}
