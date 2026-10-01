import { OrganizationData } from "../models";
import { fetchApi, getApiUrl } from "./interceptor";

/**
 * API client for organization management.
 */
export const organizationApi = {
  /**
   * Registers a new organization and assigns the current user as the owner.
   *
   * @param organizationData - `OrganizationData` object containing:
   *   - name (string): Organization name.
   *   - description (string): About the organization.
   *   - orgTypeCode (string): 'educationalInstitute', 'sportsAcademy', 'sportsClub', etc.
   *   - establishedYear (number): Year founded.
   *   - contactEmail (string): Official email.
   *   - contactPhone (string): Official phone.
   *   - address details (address, city, state, postalCode).
   *   - website (optional string): URL.
   *
   * @returns A promise resolving to the created organization's ID (string).
   */
  createOrganization: async (
    organizationData: OrganizationData,
  ): Promise<string> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/org/register" }),
      {
        method: "POST",
        contentType: "json",
        body: organizationData,
      },
    );
    if (error) throw error;

    return data as string;
  },

  /**
   * Fetches detailed information for a specific organization, including its type.
   *
   * @param orgId - The unique ID of the organization.
   * @returns A promise resolving to an `OrganizationData` object with nested `orgType`.
   */
  getInfo: async (orgId: string): Promise<OrganizationData> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: "/org/info", param: orgId }),
    );
    if (error) throw error;

    return data as OrganizationData;
  },

  /**
   * Retrieves all organizations that the current user is a member of (as owner or invited member).
   *
   * @returns A promise resolving to an array of `OrganizationData` objects.
   */
  getUserOrganizations: async (): Promise<OrganizationData[]> => {
    const { data } = await fetchApi(getApiUrl({ path: "/org/list" }));

    return data as OrganizationData[];
  },

  /**
   * Updates the profile and contact details of an existing organization.
   *
   * @param organizationData - Updated `OrganizationData` object. Must include the organization `id`.
   * @returns A promise resolving when the update is successful.
   */
  updateOrganization: async (
    organizationData: OrganizationData,
  ): Promise<void> => {
    const { error } = await fetchApi(getApiUrl({ path: "/org/update" }), {
      method: "PUT",
      contentType: "json",
      body: organizationData,
    });
    if (error) throw error;
  },

  /**
   * Retrieves all live matches within an organization, grouped by tournament.
   *
   * @param orgId - The unique ID of the organization.
   * @returns A promise resolving to an array of tournament groups with matches.
   */
  getOrgLiveMatches: async (orgId: string): Promise<any[]> => {
    const { data, error } = await fetchApi(
      getApiUrl({ path: `/org/${orgId}/matches/live` }),
      { silent: true },
    );
    if (error) throw error;
    console.info("[LiveMatchesDebug] org-live-matches", {
      orgId,
      groupCount: Array.isArray(data) ? data.length : 0,
      matchCount: Array.isArray(data)
        ? data.reduce(
            (total: number, group: any) =>
              total + (Array.isArray(group?.matches) ? group.matches.length : 0),
            0,
          )
        : 0,
    });
    return data as any[];
  },
};
