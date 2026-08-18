import { redirect } from "next/navigation";
import { toQuery } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function TournamentMatchesRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const tournamentId = first(searchParams?.id) || "";
  const eventId = first(searchParams?.eventId) || "";
  const tab = first(searchParams?.tab) || "";

  if (!tournamentId || !eventId) {
    redirect(`/tournaments/detail${toQuery({ id: tournamentId })}`);
  }

  if (tab === "leaderboard") {
    redirect(
      `/org/tournaments/event/champion${toQuery({
        tournamentId,
        eventId,
        viewOnly: "1",
      })}`,
    );
  }

  redirect(
    `/org/tournaments/event/matches${toQuery({
      tournamentId,
      eventId,
      viewOnly: "1",
    })}`,
  );
}
