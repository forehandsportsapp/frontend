import { fetchApi, getApiUrl } from "./interceptor";

type CrewRole = "admin" | "scorer";

/**
 * Arguments for sending a tournament crew invite.
 */
type SendInviteArgs = {
  phone: string;
  role: CrewRole;
  tournamentId: string;
  organizationId?: string;
};

/**
 * Expected structure of an invite response.
 */
type InviteResponse = {
  inviteId?: string;
  receiverId?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverProfilePicUrl?: string | null;
  inviteState?: "pending" | "accepted" | "rejected";
};

/**
 * Expected structure of a crew member response.
 */
type CrewMemberResponse = {
  id: string;
  inviteId?: string;
  userId?: string;
  role: CrewRole;
  name: string;
  phone?: string;
  avatarUrl?: string | null;
  status?: "invite_sent" | "accepted" | "rejected" | "idle";
};

/**
 * API client for managing tournament and team invitations.
 */
export const inviteApi = {
  /**
   * Sends an invitation to a user to join a tournament's crew (as admin or scorer).
   *
   * @param args - `SendInviteArgs` object:
   *   - phone (string): Recipient's phone number.
   *   - role (string): 'admin' or 'scorer'.
   *   - tournamentId (string): ID of the tournament.
   *   - organizationId (optional string): ID of the parent organization.
   *
   * @returns A promise resolving to an `InviteResponse`:
   *   - inviteId (string): ID of the created invitation.
   *   - receiverName (string): Name of the user found with the phone number.
   *   - receiverProfilePicUrl (string): URL to user's avatar.
   *   - inviteState (string): Current state of the invitation (usually 'pending').
   */
  sendTournamentCrewInvite: async ({
    phone,
    role,
    tournamentId,
    organizationId,
  }: SendInviteArgs): Promise<InviteResponse> => {
    const payload = {
      phone,
      role,
      tournamentId,
      organizationId,
      contextType: "tournament_crew",
      notifyReceiver: true,
    };
    const url = getApiUrl({ path: "/invite/create" });

    const { data, error } = await fetchApi(url, {
      method: "POST",
      contentType: "json",
      body: payload,
    });
    if (error) throw error;

    return (data || {}) as InviteResponse;
  },

  /**
   * Retrieves all crew member invitations (both pending and accepted) for a specific tournament.
   *
   * @param tournamentId - The unique ID of the tournament.
   * @returns A promise resolving to an array of `CrewMemberResponse` objects.
   */
  getTournamentCrew: async (
    tournamentId: string,
  ): Promise<CrewMemberResponse[]> => {
    const url = getApiUrl({ path: "/invite/tournament/crew" });
    const payload = { tournamentId };
    const { data, error } = await fetchApi(url, {
      method: "POST",
      contentType: "json",
      body: payload,
    });
    if (error) throw error;

    return Array.isArray(data) ? (data as CrewMemberResponse[]) : [];
  },

  /**
   * Removes (deletes) a specific tournament crew invitation.
   *
   * @param inviteId - The unique ID of the invitation to remove.
   * @param tournamentId - The unique ID of the tournament.
   * @returns A promise resolving when the invitation is removed.
   */
  removeTournamentCrewInvite: async (
    inviteId: string,
    tournamentId: string,
  ) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/invite/tournament/crew/remove" }),
      {
        method: "POST",
        contentType: "json",
        body: { inviteId, tournamentId },
      },
    );
    if (error) throw error;
  },

  /**
   * Sends an invitation to a user to join an event's team.
   *
   * @param payload - Object containing:
   *   - phone (string): Recipient's phone number.
   *   - eventId (string): ID of the event.
   *   - teamId (optional string): ID of the team (if joining an existing doubles team).
   *
   * @returns A promise resolving to the created invitation's data: { inviteId: string }.
   */
  sendEventTeamInvite: async (payload: {
    phone: string;
    eventId: string;
    teamId?: string | null;
    eventDisplayName?: string;
    inviterName?: string;
  }) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/invite/event/team/create" }),
      {
        method: "POST",
        contentType: "json",
        body: {
          ...payload,
          title: "Team Invitation",
          body: `${payload.inviterName || "A player"} has invited you to join their team for the event "${payload.eventDisplayName || "Tournament Event"}".`,
        },
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * Retrieves all team-related invitations sent by the current user for a specific event.
   *
   * @param eventId - The unique ID of the event.
   * @returns A promise resolving to an array of invitation objects with nested `receiver` profiles.
   */
  getEventTeamInvites: async (eventId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/invite/event/team", param: eventId }),
    );
    if (error) throw error;
    return data;
  },

  /**
   * Permanently deletes a specific invitation by its ID.
   *
   * @param inviteId - The unique ID of the invitation.
   * @returns A promise resolving when the invitation is deleted.
   */
  deleteInvite: async (inviteId: string) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/invite/delete", param: inviteId }),
      {
        method: "DELETE",
      },
    );
    if (error) throw error;
  },

  /**
   * Responds to an invitation (accept or reject).
   *
   * @param inviteId - The unique ID of the invitation.
   * @param action - The response action: 'accept' or 'reject'.
   * @returns A promise resolving when the response is recorded.
   */
  respondToInvite: async (inviteId: string, action: "accept" | "reject") => {
    const { error } = await fetchApi(getApiUrl({ path: "/invite/respond" }), {
      method: "POST",
      contentType: "json",
      body: { inviteId, action },
    });
    if (error) throw error;
  },

  /**
   * Rejects all currently pending invitations for the user.
   *
   * @returns A promise resolving when all invites are rejected.
   */
  rejectAllPendingInvites: async () => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/invite/reject-all-pending" }),
      {
        method: "POST",
        contentType: "json",
        body: {},
      },
    );
    if (error) throw error;
  },

  /**
   * Sends an invitation to a user to join an organization.
   *
   * @param payload - Object containing:
   *   - phone (string): Recipient's phone number.
   *   - organizationId (string): ID of the organization.
   *
   * @returns A promise resolving to the created invitation's data.
   */
  sendOrganizationMemberInvite: async (payload: {
    phone: string;
    organizationId: string;
  }) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/invite/organization/member/create" }),
      {
        method: "POST",
        contentType: "json",
        body: payload,
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * Lists all member invitations for a specific organization.
   *
   * @param organizationId - The unique ID of the organization.
   * @returns A promise resolving to an array of invitation objects.
   */
  getOrganizationMemberInvites: async (organizationId: string) => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/invite/organization/member/list" }),
      {
        method: "POST",
        contentType: "json",
        body: { organizationId },
      },
    );
    if (error) throw error;
    return data;
  },

  /**
   * Rescinds (deletes) an organization member invitation.
   *
   * @param inviteId - The unique ID of the invitation.
   * @param organizationId - The unique ID of the organization.
   * @returns A promise resolving when the invitation is removed.
   */
  removeOrganizationMemberInvite: async (
    inviteId: string,
    organizationId: string,
  ) => {
    const { error } = await fetchApi(
      getApiUrl({ path: "/invite/organization/member/remove" }),
      {
        method: "POST",
        contentType: "json",
        body: { inviteId, organizationId },
      },
    );
    if (error) throw error;
  },
};
