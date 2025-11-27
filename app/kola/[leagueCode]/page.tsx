import AllRoundsClient from "./client";

export default function AllRoundsPage({ params }: { params: { leagueCode: string } }) {
  return <AllRoundsClient leagueCode={params.leagueCode} />;
}
