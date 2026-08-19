import { redirect } from "next/navigation";
import { toQuery } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function TournamentOverviewRedirectPage({
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

  redirect(
    `/tournaments/detail${toQuery({
      id: tournamentId,
      selected: eventId,
    })}`,
  );
}
