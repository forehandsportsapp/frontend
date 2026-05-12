import { EventData } from "../models";
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
  };
  champion: EventResultStanding | null;
  standings: EventResultStanding[];
  totalTeams: number;
  totalMatches: number;
};

/**
 * API client for individual event management within a tournament.
 */
export const eventApi = {
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
    return data as EventResultsResponse;
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
  finalizeSchedule: async (eventId: string, matches: any[]) => {
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
