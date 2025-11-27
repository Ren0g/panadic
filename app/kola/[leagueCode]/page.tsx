import AllRoundsClient from "./client";

export default function AllRoundsPage({ params }: { params: { leagueCode: string } }) {
  const code = params?.leagueCode?.toUpperCase() as string;

  return <AllRoundsClient leagueCode={code} />;
}
