import { TournamentData } from "@/lib/models";

export type OrgTournamentStatus = "live" | "upcoming" | "past" | "drafts";

function parseTournamentDate(
  value?: string | null,
  boundary: "start" | "end" = "start",
) {
  if (!value) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (dateOnly) {
    if (boundary === "start") date.setHours(0, 0, 0, 0);
    else date.setHours(23, 59, 59, 999);
  }

  return date;
}

export function getOrgTournamentStatus(
  tournament: TournamentData,
  now = new Date(),
): OrgTournamentStatus {
  const state = tournament.tournamentState;

  if (state === "drafted") return "drafts";
  if (state === "completed" || state === "cancelled") return "past";
  if (state === "in_progress") return "live";

  const start = parseTournamentDate(tournament.startDate, "start");
  const end = parseTournamentDate(tournament.endDate, "end");

  if (end && end < now) return "past";
  if (start && start <= now && (!end || end >= now)) return "live";

  return "upcoming";
}

export function isOrgTournamentLive(tournament: TournamentData) {
  return getOrgTournamentStatus(tournament) === "live";
}

export function isOrgTournamentPast(tournament: TournamentData) {
  return getOrgTournamentStatus(tournament) === "past";
}

export function isOrgTournamentUpcoming(tournament: TournamentData) {
  return getOrgTournamentStatus(tournament) === "upcoming";
}

export function belongsToOrganization(
  tournament: TournamentData,
  organizationId?: string | null,
) {
  if (!organizationId) return false;
  return (
    tournament.organizationId === organizationId ||
    tournament.organization?.id === organizationId
  );
}
