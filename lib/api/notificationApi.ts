import { fetchApi, getApiUrl } from "./interceptor";
import { NotificationItem } from "@/components/NotificationsSlideOver";

/**
 * Arguments for sending an invite notification.
 */
type InviteNotificationArgs = {
  phone: string;
  tournamentId: string;
  tournamentName?: string;
  role: "admin" | "scorer";
};

/**
 * Helper function to post to the first working path from a list of candidates.
 * @param pathCandidates - Array of path strings to try.
 * @param body - The request body.
 */
async function postBestEffort(pathCandidates: string[], body: unknown) {
  for (const path of pathCandidates) {
    const { error } = await fetchApi(getApiUrl({ path }), {
      method: "POST",
      contentType: "json",
      body,
    });
    if (!error) return;
  }
}

function parseBackendTimestamp(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const raw = String(value);
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const date = new Date(hasTimezone ? raw : `${raw}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeTime(value: unknown) {
  const createdAt = parseBackendTimestamp(value);
  if (!createdAt) return "Just now";

  const diffSecs = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 1000),
  );
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * API client for managing user notifications and invitation responses.
 */
export const notificationApi = {
  /**
   * Retrieves all notifications and invitations for the current user.
   * Formats the backend response into a standardized `NotificationItem` for UI components.
   *
   * @returns A promise resolving to an array of `NotificationItem` objects:
   *   - id (string): Unique ID.
   *   - type (string): 'invite' etc.
   *   - title (string): Display title.
   *   - body (string): Display message.
   *   - source (string): Source name (e.g., tournament name).
   *   - timeAgo (string): Formatted relative time.
   *   - unread (boolean): Read/unread status.
   */
  getUserNotifications: async (): Promise<NotificationItem[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/user/notifications" }),
    );
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    return rows.map((row: any) => {
      // If it's an invite, the backend might provide an inviteId in metadata or as the row id
      // For now we use row.id as the fallback for invite actions
      return {
        id: String(row.id),
        inviteId: row.inviteId || row.id,
        type: row.type || "invite",
        title: row.title || "Notification",
        body: row.body || "",
        source: row.source || "",
        timeAgo: formatRelativeTime(row.createdAt),
        unread: Boolean(row.unread),
      } as NotificationItem;
    });
  },

  /**
   * Responds to an invitation to join a tournament or organization.
   *
   * @param inviteId - The unique ID of the invitation.
   * @param action - 'accept' or 'reject'.
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
   * Sends a tournament invite notification (via best-effort endpoints).
   *
   * @param args - `InviteNotificationArgs`: phone, tournamentId, tournamentName, role.
   * @returns A promise resolving once the attempt is made.
   */
  sendInviteNotification: async ({
    phone,
    tournamentId,
    tournamentName,
    role,
  }: InviteNotificationArgs) => {
    await postBestEffort(
      ["/notifications/invite", "/notification/invite", "/notification/create"],
      {
        phone,
        type: "invite",
        role,
        tournamentId,
        title: "Tournament Crew Invite",
        body: `You have been invited as ${role} for ${tournamentName || "a tournament"}.`,
      },
    );
  },

  /**
   * Sends an organization invite notification (via best-effort endpoints).
   *
   * @param args - phone, organizationId, organizationName, role.
   * @returns A promise resolving once the attempt is made.
   */
  sendOrgInviteNotification: async ({
    phone,
    organizationId,
    organizationName,
    role,
  }: {
    phone: string;
    organizationId: string;
    organizationName?: string;
    role: string;
  }) => {
    await postBestEffort(
      ["/notifications/invite", "/notification/invite", "/notification/create"],
      {
        phone,
        type: "invite",
        role,
        organizationId,
        title: "Organization Invite",
        body: `You have been invited as ${role} for ${organizationName || "an organization"}.`,
      },
    );
  },

  /**
   * Sends a teammate invite notification (via best-effort endpoints).
   *
   * @param args - phone, eventId, eventDisplayName, inviterName.
   * @returns A promise resolving once the attempt is made.
   */
  sendTeamInviteNotification: async ({
    phone,
    eventId,
    eventDisplayName,
    inviterName,
  }: {
    phone: string;
    eventId: string;
    eventDisplayName?: string;
    inviterName?: string;
  }) => {
    await postBestEffort(
      ["/notifications/invite", "/notification/invite", "/notification/create"],
      {
        phone,
        type: "invite",
        eventId,
        title: "Team Invitation",
        body: `${inviterName || "A player"} has invited you to join their team for the event "${eventDisplayName || "an event"}".`,
      },
    );
  },
};
