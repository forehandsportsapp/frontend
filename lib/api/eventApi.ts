import { EventData, TournamentData } from "../models";
import { tournamentApi } from "./tournamentApi";
import { fetchApi, getApiUrl } from "./interceptor";

export type EventResultStanding = {
  rank: number;
  teamId: string;
  teamName: string;
  avatarUrl: string | null;
  players: Array<{ id: string; name: string; avatarUrl: string | null }>;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  label: "Winner" | "Runner Up" | "Third Place" | null;
};

export type EventResultsResponse = {
  event: {
    id: string;
    name: string;
    eventState: string;
    tournamentId: string;
    tournamentName?: string;
  };
  tournamentName?: string;
  champion: EventResultStanding | null;
  standings: EventResultStanding[];
  totalTeams: number;
  totalMatches: number;
};

function getProfilePicUrl(value: any): string | null {
  const user = value?.user || value?.profile || value;
  return (
    user?.profilePicUrl ||
    user?.profile_pic_url ||
    user?.avatarUrl ||
    user?.avatar_url ||
    user?.imageUrl ||
    user?.image_url ||
    user?.photoUrl ||
    user?.photo_url ||
    null
  );
}

function normalizeResultStanding(row: any): EventResultStanding {
  const participants = Array.isArray(row?.participants) ? row.participants : [];
  const playersSource = Array.isArray(row?.players)
    ? row.players
    : participants.length > 0
      ? participants
      : [];
  const players = playersSource.map((player: any) => {
    const user = player?.user || player?.profile || player;
    return {
      id: user?.id || player?.userId || player?.id || "",
      name: user?.name || player?.name || "Player",
      avatarUrl: getProfilePicUrl(player),
    };
  });

  return {
    ...row,
    avatarUrl:
      getProfilePicUrl(row) ||
      players.find((player: { avatarUrl: string | null }) => player.avatarUrl)
        ?.avatarUrl ||
      null,
    players,
  } as EventResultStanding;
}

function normalizeEventResults(data: any): EventResultsResponse {
  const standings = Array.isArray(data?.standings)
    ? data.standings.map(normalizeResultStanding)
    : [];
  const champion = data?.champion
    ? normalizeResultStanding(data.champion)
    : standings[0] || null;

  return {
    ...data,
    champion,
    standings,
  } as EventResultsResponse;
}

export type FinalizeScheduleMatchPayload = {
  roundNumber: number;
  teamA: string;
  teamB: string;
  scorer?: string;
  setsPerMatch?: number;
  pointsPerSet?: number;
  startTime: string;
  sideSwitching?: "per_set" | "half_set" | "no_switch";
};

export type EventUpdatePayload = Partial<
  Pick<
    EventData,
    | "name"
    | "sportsOptionCode"
    | "eventFormatCode"
    | "dueDate"
    | "startDate"
    | "gender"
    | "teamTypeCode"
    | "setsPerMatch"
    | "pointsPerSet"
    | "playerBornAfter"
    | "paymentModeCode"
    | "amount"
  >
>;

/**
 * API client for individual event management within a tournament.
 */
export const eventApi = {
  /**
   * Creates one or more events for a tournament.
   *
   * The backend expects an array body and reads code fields such as
   * `teamTypeCode`, not display labels or nested option objects.
   */
  createEvents: async (events: EventData[]) => {
    const { error } = await fetchApi(getApiUrl({ path: "/event/create" }), {
      method: "POST",
      contentType: "json",
      body: events,
    });
    if (error) throw error;
  },

  /**
   * Fetches detailed information for a specific event.
   *
   * @param eventId - The unique ID of the event.
   * @returns A promise resolving to an `EventData` object.
   */
  getEventById: async (eventId: string): Promise<EventData> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/event", param: eventId }),
    );
    if (error) throw error;

    return data as EventData;
  },

  /**
   * Fetches a single event and falls back to the parent tournament payload if
   * the direct event endpoint is unavailable in the running backend build.
   */
  getEventByIdSafe: async (
    eventId: string,
    tournamentId?: string,
  ): Promise<{ event: EventData | null; tournament: TournamentData | null }> => {
    try {
      const event = await eventApi.getEventById(eventId);
      return { event, tournament: (event as any)?.tournament ?? null };
    } catch (error) {
      if (!tournamentId) throw error;

      const tournament = await tournamentApi.getInfo(tournamentId);
      const event = (tournament?.events ?? []).find((item) => item.id === eventId) || null;
      return {
        event: event
          ? {
              ...event,
              tournamentId: event.tournamentId || tournament.id || tournamentId,
            }
          : null,
        tournament,
      };
    }
  },

  /**
   * Updates editable event details.
   *
   * @param eventId - The unique ID of the event.
   * @param event - Partial event fields to update.
   * @returns A promise resolving when the event is updated.
   */
  updateEvent: async (eventId: string, event: EventUpdatePayload) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/event", param: eventId }),
      {
        method: "PATCH",
        contentType: "json",
        body: event,
      },
    );
    if (error) throw error;
  },

  /**
   * Fetches all participants (users and their teams) registered for a specific event.
   *
   * @param eventId - The unique ID of the event.
   * @returns A promise resolving to an array of objects: { user: Profile, team: Team }.
   */
  getEventParticipants: async (eventId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/event/participants", param: eventId }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Fetches computed event standings/champion and full results table.
   */
  getEventResults: async (eventId: string): Promise<EventResultsResponse> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/event/results", param: eventId }),
    );
    if (error) throw error;
    return normalizeEventResults(data);
  },

  /**
   * Permanently deletes a specific event and its related data (teams, matches).
   *
   * @param eventId - The unique ID of the event to delete.
   * @returns A promise resolving when the event is deleted.
   */
  deleteEvent: async (eventId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/event", param: eventId }),
      {
        method: "DELETE",
      },
    );
    if (error) throw error;
  },

  /**
   * Updates the state of a specific event.
   *
   * @param eventId - The unique ID of the event.
   * @param state - The new state: 'created', 'registration_closed', 'participants_finalized', 'scheduled', 'in_progress', 'round_over', 'completed', 'cancelled'.
   * @returns A promise resolving when the event state is updated.
   */
  updateEventState: async (
    eventId: string,
    state:
      | "created"
      | "registration_closed"
      | "participants_finalized"
      | "scheduled"
      | "in_progress"
      | "round_over"
      | "completed"
      | "cancelled",
  ) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/event/update-state", param: eventId }),
      {
        method: "POST",
        contentType: "json",
        body: { state },
      },
    );
    if (error) throw error;
  },

  updateEventDueDate: async (eventId: string, dueDate: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/event/update-due-date", param: eventId }),
      {
        method: "POST",
        contentType: "json",
        body: { dueDate },
      },
    );
    if (error) throw error;
  },

  /**
   * Finalizes the participants for an event, locking the list and preparing for round 1.
   *
   * @param eventId - The unique ID of the event.
   * @returns A promise resolving when the participants are finalized.
   */
  finalizeParticipants: async (eventId: string) => {
    const { error } = await fetchApi(
      getApiUrl({
        path: "/event/finalize-participants",
        param: eventId,
      }),
      {
        method: "POST",
      },
    );
    if (error) throw error;
  },

  /**
   * Finalizes the schedule for an event, creating matches and setting state to 'scheduled'.
   *
   * @param eventId - The unique ID of the event.
   * @param matches - Array of matches to create.
   * @returns A promise resolving when the schedule is finalized.
   */
  finalizeSchedule: async (
    eventId: string,
    matches: FinalizeScheduleMatchPayload[],
  ) => {
    const { error } = await fetchApi(
      getApiUrl({
        path: "/event/finalize-schedule",
        param: eventId,
      }),
      {
        method: "POST",
        contentType: "json",
        body: { matches },
      },
    );
    if (error) throw error;
  },

  /**
   * Finalizes an event, assigning the winner and setting state to 'completed'.
   *
   * @param eventId - The unique ID of the event.
   * @param winnerId - ID of the winning team.
   * @returns A promise resolving when the event is completed.
   */
  completeEvent: async (eventId: string, winnerId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/event/complete", param: eventId }),
      {
        method: "POST",
        contentType: "json",
        body: { winnerId },
      },
    );
    if (error) throw error;
  },
};
