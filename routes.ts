export type Primitive = string | number | boolean | null | undefined;

function toQuery(params: Record<string, Primitive>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export const routes = {
  learnTopic: (topic: string) => `/learn/topic/${toQuery({ topic })}`,
  matchLive: (params: {
    matchId: string;
    format?: string;
    scoring?: string;
    bestOf?: number;
    points?: number;
    winByTwo?: boolean;
    server?: number;
    p1?: string;
    p2?: string;
    p3?: string;
    p4?: string;
    court?: string;
    quick?: string | number;
  }) => `/match/live/${toQuery(params)}`,
  orgDetail: (orgId: string) => `/org/detail/${toQuery({ orgId })}`,
  tournamentDetail: (id: string) => `/tournaments/detail/${toQuery({ id })}`,
  tournamentEvent: (id: string, event?: string) => `/tournaments/event/${toQuery({ id, event })}`,
  tournamentEventOverview: (id: string, eventId: string, tab?: "leaderboard" | "fixtures") =>
    tab === "leaderboard"
      ? `/user/tournaments/event/champion/${toQuery({
          tournamentId: id,
          eventId,
        })}`
      : `/user/tournaments/event/matches/${toQuery({
          tournamentId: id,
          eventId,
        })}`,
  tournamentMatches: (id: string) =>
    `/user/tournaments/event/matches/${toQuery({ tournamentId: id })}`,
  tournamentEventMatches: (id: string, eventId: string) =>
    `/user/tournaments/event/matches/${toQuery({
      tournamentId: id,
      eventId,
    })}`,
  tournamentCheckout: (id: string) => `/tournaments/checkout/${toQuery({ id })}`,
  orgTournamentDetail: (t: string) => `/org/tournaments/detail/${toQuery({ t })}`,
  orgEventParticipants: (tournamentId: string, eventId: string) =>
    `/org/tournaments/event/participants/${toQuery({ tournamentId, eventId })}`,
  orgEventFixture: (tournamentId: string, eventId: string) =>
    `/org/tournaments/event/fixture/${toQuery({ tournamentId, eventId })}`,
  orgEventChampion: (tournamentId: string, eventId: string) =>
    `/org/tournaments/event/champion/${toQuery({ tournamentId, eventId })}`,
  orgEventMatches: (tournamentId: string, eventId: string) =>
    `/org/tournaments/event/matches/${toQuery({ tournamentId, eventId })}`,
  orgMatchSetup: (tournamentId: string, eventId: string, matchId: string) =>
    `/org/tournaments/event/match/setup/${toQuery({ tournamentId, eventId, matchId })}`,
  orgMatchLive: (tournamentId: string, eventId: string, matchId: string) =>
    `/org/tournaments/event/match/live/${toQuery({ tournamentId, eventId, matchId })}`,
  orgMatchResult: (tournamentId: string, eventId: string, matchId: string) =>
    `/org/tournaments/event/match/result/${toQuery({ tournamentId, eventId, matchId })}`,
  userSettings: () => "/user/settings/",
  userSettingsProfile: () => "/user/settings/profile/",
  userSettingsNotifications: () => "/user/settings/notifications/",
  userSettingsPrivacy: () => "/user/settings/privacy/",
  userSettingsPreferences: () => "/user/settings/preferences/",
  userSettingsHelp: () => "/user/settings/help/",
};
