import { TournamentData, TournamentSummaryData } from "../models";
import { fetchApi, getApiUrl } from "./interceptor";

/**
 * API client for tournament and event management.
 */
export const tournamentApi = {
  /**
   * Creates a new tournament within an organization.
   *
   * @param tournament - `TournamentData` object containing details:
   *   - organizationId (string): ID of the parent organization.
   *   - name (string): Tournament name.
   *   - description (string): About the tournament.
   *   - startDate, endDate (string): ISO dates.
   *   - venue details (venueName, address, city, state, postalCode, venueCourts).
   *   - contact details (contactName, contactEmail, contactPhone).
   *   - upiId (optional string): For payments.
   *
   * @returns A promise resolving to the created tournament's ID (string).
   */
  createTournament: async (tournament: TournamentData): Promise<string> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/tournament/create" }),
      {
        method: "POST",
        contentType: "json",
        body: tournament,
      },
    );
    if (error) throw error;

    return data as string;
  },

  /**
   * Fetches detailed information for a specific tournament, including its events and organization details.
   *
   * @param tournamentId - The unique ID of the tournament.
   * @returns A promise resolving to a `TournamentData` object with nested `events` and `organization`.
   */
  getInfo: async (tournamentId: string): Promise<TournamentData> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/tournament/info", param: tournamentId }),
    );
    if (error) throw error;

    return data as TournamentData;
  },

  getSummary: async (tournamentId: string): Promise<TournamentSummaryData> => {
    const url = getApiUrl({ path: "/tournament/summary", param: tournamentId });
    console.info("[tournamentApi.getSummary] requesting", {
      tournamentId,
      url,
      expectedRouteFormat: "/tournament/summary/:tournamentId",
      alternateTQueryUrl: `${getApiUrl({ path: "/tournament/summary" })}?t=${encodeURIComponent(tournamentId)}`,
    });

    const { data, error } = await fetchApi(
      url,
    );
    if (error) {
      console.error("[tournamentApi.getSummary] failed", {
        tournamentId,
        url,
        error,
      });
      throw error;
    }
    return data as TournamentSummaryData;
  },

  /**
   * Retrieves all tournaments owned by a specific organization.
   *
   * @param orgId - The unique ID of the organization.
   * @returns A promise resolving to an array of `TournamentData` objects, each including basic event info.
   */
  getOrganizationTournaments: async (
    orgId: string,
  ): Promise<TournamentData[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/tournament/list/org", param: orgId }),
    );
    if (error) throw error;

    return data as TournamentData[];
  },

  /**
   * Retrieves all 'published' tournaments available for users to browse and join.
   * Filters out tournaments the user has already joined and those not matching their gender.
   *
   * @returns A promise resolving to an array of `TournamentData` objects.
   */
  getBrowseTournaments: async (): Promise<TournamentData[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/tournament/list/user/browse" }),
    );
    if (error) throw error;

    return data as TournamentData[];
  },

  /**
   * Retrieves tournaments that the currently authenticated user has joined as a participant.
   *
   * @returns A promise resolving to an array of `TournamentData` objects with nested joined `events`.
   */
  getJoinedTournaments: async (): Promise<TournamentData[]> => {
    const { data, error = null } = await fetchApi(
      getApiUrl({ path: "/tournament/list/user/joined" }),
    );
    if (error) throw error;

    return data as TournamentData[];
  },

  /**
   * Retrieves historical (completed) tournaments that the current user participated in.
   *
   * @returns A promise resolving to an array of completed `TournamentData` objects.
   */
  getHistoryTournaments: async (): Promise<TournamentData[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/tournament/list/user/history" }),
    );
    if (error) throw error;

    return data as TournamentData[];
  },

  /**
   * Fetches all unique participants (users/players) and their associated teams/events for a tournament.
   *
   * @param tournamentId - The unique ID of the tournament.
   * @returns A promise resolving to an array of objects: { user: Profile, team: Team, event: Event }.
   */
  getTournamentParticipants: async (tournamentId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/tournament/participants", param: tournamentId }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Updates the overall state of a tournament.
   *
   * @param tournamentId - The unique ID of the tournament.
   * @param state - The new state: 'drafted', 'published', 'in_progress', 'completed', 'cancelled'.
   * @returns A promise resolving when the state is updated.
   */
  updateTournamentState: async (
    tournamentId: string,
    state: "drafted" | "published" | "in_progress" | "completed" | "cancelled",
  ) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/tournament/update-state", param: tournamentId }),
      {
        method: "POST",
        contentType: "json",
        body: { state },
      },
    );
    if (error) throw error;
  },

  /**
   * Transitions a tournament from 'drafted' to 'published', making it visible to users.
   *
   * @param tournamentId - The unique ID of the tournament.
   * @returns A promise resolving when the tournament is published.
   */
  publishTournament: async (tournamentId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/tournament/publish", param: tournamentId }),
      {
        method: "POST",
      },
    );
    if (error) throw error;
  },

  /**
   * Permanently deletes a tournament and ALL related data (events, teams, matches, sets).
   *
   * @param tournamentId - The unique ID of the tournament to delete.
   * @returns A promise resolving when the tournament is deleted.
   */
  deleteTournament: async (tournamentId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/tournament/delete", param: tournamentId }),
      {
        method: "DELETE",
      },
    );
    if (error) throw error;
  },

  /**
   * Automatically re-evaluates and updates the tournament state based on the states of its events.
   *
   * @param tournamentId - The unique ID of the tournament.
   * @returns A promise resolving when the sync is complete.
   */
  syncTournamentStatus: async (tournamentId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/tournament/sync-status", param: tournamentId }),
      {
        method: "POST",
      },
    );
    if (error) throw error;
  },
};
