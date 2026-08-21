import { fetchApi, getApiUrl } from "./interceptor";

/**
 * Payload for creating one or more matches.
 */
export interface CreateMatchPayload {
  eventId: string;
  roundNumber: number;
  teamA: string;
  teamB: string;
  scorer?: string;
  winnerId?: string | null;
  matchState?:
    | "scheduled"
    | "in_progress"
    | "completed"
    | "abandoned"
    | "walkover";
  setsPerMatch?: number;
  pointsPerSet?: number;
  startTime?: string;
  sideSwitching?: "per_set" | "half_set" | "no_switch";
}

/**
 * Payload for updating a set score and potentially match state.
 */
export interface UpdateScorePayload {
  matchId: string;
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  setStatus: "not_started" | "in_progress" | "completed";
  winnerId?: string | null;
  matchFinished?: boolean;
  matchWinnerId?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
}

export interface AvailableScorer {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * API client for match-related operations.
 */
export const matchApi = {
  /**
   * Bulk creates matches for an event.
   *
   * @param matches - An array of `CreateMatchPayload` objects.
   *   - eventId (string): The ID of the event these matches belong to.
   *   - roundNumber (number): The round this match is part of.
   *   - teamA (string): ID of the first team.
   *   - teamB (string): ID of the second team.
   *   - scorer (optional string): User ID of the assigned scorer.
   *   - winnerId (optional string): ID of the winning team if already known.
   *   - matchState (optional): 'scheduled', 'in_progress', 'completed', etc.
   *   - setsPerMatch (optional number): Override event-level sets per match.
   *   - pointsPerSet (optional number): Override event-level points per set.
   *   - startTime (optional string): ISO start time for scheduled matches.
   *   - sideSwitching (optional): 'per_set', 'half_set', 'no_switch'.
   *
   * @returns A promise resolving to the API response data containing an array of results for each match creation attempt.
   *   Each result item: { success: boolean, message: string, data?: { matchId: string } }
   */
  createMatches: async (matches: CreateMatchPayload[]) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/create" }),
      {
        method: "POST",
        contentType: "json",
        body: matches,
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * Updates the overall state and winner of a specific match.
   *
   * @param matchId - The unique ID of the match to update.
   * @param state - The new state of the match.
   *   Allowed values: 'scheduled', 'in_progress', 'completed', 'abandoned', 'walkover'.
   * @param winnerId - (Optional) The ID of the team that won the match. Pass null to clear.
   *
   * @returns A promise that resolves when the update is successful.
   */
  updateMatchState: async (
    matchId: string,
    state: "scheduled" | "in_progress" | "completed" | "abandoned" | "walkover",
    winnerId?: string | null,
  ) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/match/update-state", param: matchId }),
      {
        method: "POST",
        contentType: "json",
        body: { state, winnerId },
      },
    );
    if (error) throw error;
  },

  /**
   * Updates the score and status for a specific set within a match.
   *
   * @param payload - `UpdateScorePayload` object.
   *   - matchId (string): ID of the match.
   *   - setNumber (number): Which set is being updated (1, 2, 3...).
   *   - teamAScore (number): Current score for Team A in this set.
   *   - teamBScore (number): Current score for Team B in this set.
   *   - setStatus (string): 'not_started', 'in_progress', or 'completed'.
   *   - winnerId (optional string): ID of the set winner.
   *   - matchFinished (optional boolean): Flag if this set ends the whole match.
   *   - matchWinnerId (optional string): ID of the match winner if matchFinished is true.
   *
   * @returns A promise that resolves when the score update is successful.
   */
  updateScore: async (payload: UpdateScorePayload) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/match/update-score" }),
      {
        method: "POST",
        contentType: "json",
        body: payload,
      },
    );
    if (error) throw error;
  },

  /**
   * Retrieves all matches associated with a specific event, including their set data and participant details.
   *
   * @param eventId - The unique ID of the event.
   * @returns A promise resolving to an array of match objects.
   *   Each match includes: sets, teamAData (with participants/users), teamBData (with participants/users).
   */
  getMatchesByEvent: async (eventId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/list", param: eventId }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Retrieves matches for a specific round within an event.
   *
   * @param eventId - The unique ID of the event.
   * @param roundNumber - The round number to filter matches by.
   * @returns A promise resolving to an array of match objects for that specific round.
   */
  getMatchesByEventAndRound: async (eventId: string, roundNumber: number) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/list", param: eventId }),
      {
        method: "POST",
        contentType: "json",
        body: { roundNumber },
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * Fetches full details for a single match, including scores, participants, and parent event/tournament info.
   *
   * @param matchId - The unique ID of the match.
   * @returns A promise resolving to a detailed match object.
   *   Includes: sets, teamAData, teamBData, event (with tournament), scorerUser, winner.
   */
  getMatchInfo: async (matchId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/info", param: matchId }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Retrieves scorer options for a match, excluding scorers already assigned
   * to another active match in the same round.
   */
  getAvailableScorers: async (matchId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/available-scorers", param: matchId }),
    );
    if (error) throw error;
    return (data || {
      currentScorerId: null,
      currentScorerName: null,
      scorers: [],
    }) as {
      currentScorerId?: string | null;
      currentScorerName?: string | null;
      scorers: AvailableScorer[];
    };
  },

  /**
   * Assigns or reassigns a scorer for a match.
   */
  assignScorer: async (matchId: string, scorerId: string | null) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/assign-scorer", param: matchId }),
      {
        method: "POST",
        contentType: "json",
        body: { scorerId },
      },
    );
    if (error) throw error;
    return (data || null) as AvailableScorer | null;
  },

  /**
   * Retrieves courts not assigned to another unfinished match.
   */
  getAvailableCourts: async (matchId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/available-courts", param: matchId }),
      { method: "POST" },
    );
    if (error) throw error;
    return (data || {
      currentCourtName: null,
      courts: [],
    }) as {
      currentCourtName?: string | null;
      courts: string[];
    };
  },

  /**
   * Assigns, reassigns, or clears a court for a match.
   */
  assignCourt: async (matchId: string, courtName: string | null) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/assign-court", param: matchId }),
      {
        method: "POST",
        contentType: "json",
        body: { courtName },
      },
    );
    if (error) throw error;
    return (data || { courtName: null }) as { courtName: string | null };
  },

  /**
   * Retrieves matches assigned to the currently authenticated user as scorer.
   *
   * @returns A promise resolving to an array of matches.
   */
  getScorerMatches: async () => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/scorer-matches" }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Starts a match, transitioning it to 'in_progress' and automatically updating the event state to 'in_progress'.
   *
   * @param matchId - The unique ID of the match to start.
   * @returns A promise resolving when the match is started.
   */
  startMatch: async (matchId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/match/start", param: matchId }),
      {
        method: "POST",
      },
    );
    if (error) throw error;
  },

  /**
   * Completes a match, sets the winner, and transitions its state to 'completed'.
   * Also automatically updates the losing team status to 'eliminated'.
   *
   * @param matchId - The unique ID of the match.
   * @param winnerId - The ID of the winning team.
   * @returns A promise resolving when the match is completed.
   */
  completeMatch: async (matchId: string, winnerId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/match/complete", param: matchId }),
      {
        method: "POST",
        contentType: "json",
        body: { winnerId },
      },
    );
    if (error) throw error;
  },

  /**
   * Explicitly initializes a set record for a match.
   *
   * @param matchId - ID of the match.
   * @param setNumber - Sequential set number (1, 2, 3...).
   * @returns A promise resolving to the created set's ID.
   */
  initializeSet: async (matchId: string, setNumber: number) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/set/initialize" }),
      {
        method: "POST",
        contentType: "json",
        body: { matchId, setNumber },
      },
    );
    if (error) throw error;
    return data?.setId as string;
  },

  /**
   * Fetches detailed information for a single set, including its parent match and tournament context.
   *
   * @param setId - The unique ID of the set.
   * @returns A promise resolving to the set data object.
   *   Includes: match (with event/tournament), winner.
   */
  getSetInfo: async (setId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/match/set/info", param: setId }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Updates the progress status of a specific set.
   *
   * @param setId - The unique ID of the set.
   * @param state - The new status ('not_started', 'in_progress', 'completed').
   * @returns A promise that resolves when the set status is updated.
   */
  updateSetState: async (
    setId: string,
    state: "not_started" | "in_progress" | "completed",
  ) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/match/set/update-state", param: setId }),
      {
        method: "POST",
        contentType: "json",
        body: { state },
      },
    );
    if (error) throw error;
  },
};
