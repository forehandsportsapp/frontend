import { OrganizationData, ProfileData } from "../models";
import { fetchApi, getApiUrl } from "./interceptor";

/**
 * Structure of a notification item returned by the user notifications endpoint.
 */
export interface UserNotification {
  id: string;
  type: "invite";
  title: string;
  body: string;
  source: string;
  createdAt: string | null;
  unread: boolean;
}

export interface UserBootstrapData {
  profile: ProfileData | null;
  organizations: OrganizationData[];
}

export interface UserLiveSummaryData {
  match: any | null;
  feed: any[];
}

/**
 * API client for user profile management and notifications.
 */
export const userApi = {
  /**
   * Retrieves the current user's profile and organization list in one request.
   * This keeps app boot fast without broadening access; the backend derives
   * both records from the authenticated token.
   */
  getBootstrap: async (): Promise<UserBootstrapData> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/bootstrap" }),
    );
    if (error) throw error;
    return data as UserBootstrapData;
  },

  /**
   * Retrieves the current authenticated user's profile information.
   *
   * @returns A promise resolving to a `ProfileData` object:
   *   - id (string): User's unique ID.
   *   - name (string): Full name.
   *   - phone (string): Contact number.
   *   - gender (string): 'male' or 'female'.
   *   - dob (string): ISO date of birth.
   *   - playingHand (string): 'left' or 'right' or null.
   *   - primarySport (string): Main sport of interest or null.
   *   - profilePicUrl (optional string): Signed URL to the avatar image.
   *   - profilePicPath (optional string): Internal storage path for the avatar.
   */
  getInfo: async (): Promise<ProfileData> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/profile" }),
    );
    if (error) throw error;
    return data as ProfileData;
  },

  /**
   * Retrieves basic profile information for any user by their unique ID or phone number.
   * This is typically used to display participant or member details.
   *
   * @param identifier - The unique ID or 10-digit phone number (starts with 6-9) of the user to fetch.
   * @returns A promise resolving to a partial `ProfileData` object:
   *   - id (string): User's ID.
   *   - name (string): User's name.
   *   - profilePicUrl (string): Avatar URL.
   *   - profilePicPath (string): Avatar storage path.
   *   - gender (string): User's gender.
   *   - primarySport (string): User's primary sport.
   */
  getUserProfileInfo: async (
    identifier: string,
  ): Promise<Partial<ProfileData>> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/userProfile/info", param: identifier }),
    );
    if (error) throw error;
    return data as Partial<ProfileData>;
  },

  /**
   * Registers a new user profile. This should be called once after the user's first login.

   *
   * @param profileData - `ProfileData` object containing:
   *   - name (string): Full name.
   *   - phone (string): 10-digit phone number (starts with 6-9).
   *   - gender (string): 'male' or 'female'.
   *   - dob (string): ISO date string (YYYY-MM-DD).
   *   - playingHand (string | null): 'left' or 'right'.
   *   - primarySport (string | null): Code or name of the primary sport.
   *
   * @returns A promise resolving when the profile is successfully created.
   */
  registerUser: async (profileData: ProfileData): Promise<void> => {
    const { error } = await fetchApi(getApiUrl({ path: "/user/register" }), {
      method: "POST",
      contentType: "json",
      body: {
        name: profileData.name,
        phone: profileData.phone,
        gender: profileData.gender,
        dob: profileData.dob,
        playingHand: profileData.playingHand,
        primarySport: profileData.primarySport,
      },
    });
    if (error) throw error;
  },

  /**
   * Updates the current user's profile details.
   *
   * @param profileData - Updated `ProfileData` object (same fields as registerUser).
   * @returns A promise resolving when the update is successful.
   */
  updateProfile: async (profileData: ProfileData): Promise<void> => {
    const { error } = await fetchApi(getApiUrl({ path: "/user/update" }), {
      method: "PUT",
      contentType: "json",
      body: {
        name: profileData.name,
        phone: profileData.phone,
        gender: profileData.gender,
        dob: profileData.dob,
        playingHand: profileData.playingHand,
        primarySport: profileData.primarySport,
      },
    });
    if (error) throw error;
  },

  /**
   * Validates if a phone number is already registered by another user.
   *
   * @param contact - The 10-digit phone number to validate.
   * @returns A promise resolving to a boolean: `true` if the contact is valid (available), `false` if already in use.
   */
  validateContact: async (contact: string): Promise<boolean> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/validate-contact" }),
      {
        method: "POST",
        contentType: "json",
        body: {
          data: contact,
        },
      },
    );

    if (error) throw error;

    return data as boolean;
  },

  /**
   * Retrieves all pending invitations (tournaments and organizations) for the current user.
   * The notifications are sorted by creation date (newest first).
   *
   * @returns A promise resolving to an array of `UserNotification` objects:
   *   - id (string): The invite ID (used for responding).
   *   - type (string): Always 'invite' for current version.
   *   - title (string): E.g., 'Tournament Crew Invite' or 'Organization Invite'.
   *   - body (string): Descriptive invitation text.
   *   - source (string): Name of the tournament or organization.
   *   - createdAt (string): ISO timestamp of the invite.
   *   - unread (boolean): True if the invite is still 'pending'.
   */
  getUserNotifications: async (): Promise<UserNotification[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/notifications" }),
    );
    if (error) throw error;
    return data as UserNotification[];
  },

  /**
   * Retrieves the current user's match statistics (played, won, lost).
   *
   * @returns A promise resolving to an object containing match statistics.
   */
  getUserStats: async (): Promise<{
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
  }> => {
    const { data, error } = await fetchApi(getApiUrl({ path: "/user/stats" }));
    if (error) throw error;
    return data as {
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
    };
  },

  /**
   * Retrieves the current user's past (completed) matches.
   *
   * @returns A promise resolving to an array of past match objects.
   */
  getPastMatches: async (): Promise<any[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/matches/past" }),
    );
    if (error) throw error;
    return data as any[];
  },

  /**
   * Retrieves the current user's live match, if any.
   *
   * @returns A promise resolving to the live match data, or null.
   */
  getLiveMatch: async (): Promise<any | null> => {
    const path = getApiUrl({ path: "/user/matches/live" });
    const { data, error } = await fetchApi(
      path,
      { silent: true },
    );
    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Retrieves the live match feed for tournaments the user has joined.
   * Grouped by tournament.
   */
  getLiveFeed: async (): Promise<any[]> => {
    const path = getApiUrl({ path: "/user/matches/live-feed" });
    const { data, error } = await fetchApi(
      path,
      { silent: true },
    );
    if (error) {
      throw error;
    }
    return data as any[];
  },

  /**
   * Retrieves the current user's live match and joined tournament feed in one
   * protected request. Falls back to the older split endpoints during rollout.
   */
  getLiveSummary: async (): Promise<UserLiveSummaryData> => {
    const path = getApiUrl({ path: "/user/matches/live-summary" });
    const { data, error } = await fetchApi(path, { silent: true });
    if (!error) {
      return {
        match: data?.match ?? null,
        feed: Array.isArray(data?.feed) ? data.feed : [],
      };
    }

    const errorMessage = String(error);
    const isRouteMissing =
      errorMessage.includes("404") || errorMessage.includes("Not Found");
    if (!isRouteMissing) throw error;

    const [match, feed] = await Promise.all([
      userApi.getLiveMatch(),
      userApi.getLiveFeed(),
    ]);
    return { match, feed };
  },

  /**
   * Retrieves the current user's upcoming matches.
   */
  getUpcomingMatches: async (): Promise<any[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/matches/upcoming" }),
    );
    if (error) throw error;
    return data as any[];
  },
};
