import { NextMatch } from "@/lib/nextMatch";

type Props = {
  match: NextMatch | null;
  title?: string;
};

export function NextMatchCard({ match, title = "Sljedeća utakmica" }: Props) {
  if (!match) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-500">
          Trenutno nema zakazanih sljedećih utakmica.
        </p>
      </div>
    );
  }

  const dateStr = match.match_date
    ? new Date(match.match_date).toLocaleDateString("hr-HR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col items-center gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="text-center text-sm">
        <div className="font-semibold text-green-700">
          {match.isHome ? match.home_team_name : match.away_team_name}
        </div>
        <div className="text-xs text-gray-500">vs</div>
        <div className="font-semibold">
          {match.isHome ? match.away_team_name : match.home_team_name}
        </div>
      </div>

      <div className="text-sm text-gray-700">
        {match.round && <div>{match.round}</div>}
        {dateStr && <div>{dateStr}</div>}
        {match.match_time && <div>{match.match_time}</div>}
      </div>
    </div>
  );
}
