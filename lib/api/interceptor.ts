import { getSupabaseBrowserClient } from "../supabase";

type ApiResponse = {
  message: string;
  success: boolean;
  data?: any | null | undefined;
};

type ParsedRespone = {
  data?: any | null | undefined;
  error?: any | undefined | unknown;
};

const TOKEN_REFRESH_BUFFER_MS = 30_000;
const NO_SESSION_CACHE_MS = 5_000;

let cachedAccessToken: string | null | undefined;
let cachedAccessTokenExpiresAtMs = 0;
let pendingAccessToken: Promise<string | null> | null = null;
let authListenerInitialized = false;
const pendingGetRequests = new Map<string, Promise<ParsedRespone>>();

function cacheSessionToken(
  session?: { access_token?: string; expires_at?: number | null } | null,
) {
  cachedAccessToken = session?.access_token ?? null;

  if (cachedAccessToken) {
    const expiresAtMs = session?.expires_at
      ? session.expires_at * 1000 - TOKEN_REFRESH_BUFFER_MS
      : Date.now() + TOKEN_REFRESH_BUFFER_MS;
    cachedAccessTokenExpiresAtMs = Math.max(Date.now(), expiresAtMs);
    return;
  }

  cachedAccessTokenExpiresAtMs = Date.now() + NO_SESSION_CACHE_MS;
}

export function clearApiAuthCache() {
  cachedAccessToken = undefined;
  cachedAccessTokenExpiresAtMs = 0;
  pendingAccessToken = null;
  pendingGetRequests.clear();
}

async function getCachedAccessToken() {
  const supabaseClient = getSupabaseBrowserClient();

  if (!authListenerInitialized) {
    authListenerInitialized = true;
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      cacheSessionToken(session);
      pendingAccessToken = null;
    });
  }

  if (
    cachedAccessToken !== undefined &&
    cachedAccessTokenExpiresAtMs > Date.now()
  ) {
    return cachedAccessToken;
  }

  if (!pendingAccessToken) {
    pendingAccessToken = supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        cacheSessionToken(data.session);
        return cachedAccessToken ?? null;
      })
      .catch((error) => {
        clearApiAuthCache();
        throw error;
      })
      .finally(() => {
        pendingAccessToken = null;
      });
  }

  return pendingAccessToken;
}

/**
 * Formats the API URL by joining the base URL, path, and optional parameters.
 * Handles both relative paths and absolute URLs.
 *
 * @param options - Object containing the path and an optional param.
 * @returns The complete API URL.
 */
export function getApiUrl({
  path,
  param,
}: {
  path: string;
  param?: string;
}): string {
  if (/^https?:\/\//i.test(path)) {
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const cleanParam = param ? `/${param}` : "";
    return `${cleanPath}${cleanParam}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const cleanParam = param ? `/${param}` : "";
  return `${cleanBaseUrl}${cleanPath}${cleanParam}`;
}

/**
 * Generic fetch wrapper for API requests.
 * Handles authentication headers, content-type, and standardizes error handling.
 * Automatically parses JSON responses and extracts data from the standard response wrapper.
 *
 * @param path - The full URL or relative path to fetch.
 * @param options - Fetch options including method, body, and content-type.
 * @returns A promise resolving to an object containing either `data` or `error`.
 */
export const fetchApi = async (
  path: string,
  {
    method = "GET",
    contentType,
    body,
    silent = false,
  }: {
    method?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
    contentType?: "json";
    body?: any;
    silent?: boolean;
  } = {},
): Promise<ParsedRespone> => {
  if (method === "GET") {
    const pendingKey = `${method}:${path}`;
    const pending = pendingGetRequests.get(pendingKey);
    if (pending) {
      return pending;
    }

    const request = fetchApiUncached(path, {
      method,
      contentType,
      body,
      silent,
    }).finally(() => {
      pendingGetRequests.delete(pendingKey);
    });

    pendingGetRequests.set(pendingKey, request);
    return request;
  }

  return fetchApiUncached(path, { method, contentType, body, silent });
};

const fetchApiUncached = async (
  path: string,
  {
    method = "GET",
    contentType,
    body,
    silent = false,
  }: {
    method?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
    contentType?: "json";
    body?: any;
    silent?: boolean;
  } = {},
): Promise<ParsedRespone> => {
  try {
    const accessToken = await getCachedAccessToken();

    let headers: Record<string, string> = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    if (contentType) {
      headers["Content-Type"] =
        contentType === "json" ? "application/json" : "";
    }

    const bodyContent =
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;

    // If it's FormData, let the browser set the Content-Type header with the boundary
    if (body instanceof FormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(path, {
      headers,
      method,
      body: bodyContent,
    });

    const result = await res.json().catch(() => null);

    if (!res.ok) {
      // Handle Elysia validation errors or other server errors
      const errorMessage =
        result?.message ||
        result?.summary ||
        (result?.errors ? JSON.stringify(result.errors) : null) ||
        `HTTP ${res.status} ${res.statusText} for ${path}`;

      throw new Error(errorMessage);
    }

    if (result && typeof result === "object" && "success" in result) {
      if (!result.success) {
        throw new Error(result.message || "Call completed unsuccessfully");
      }

      // If it's a GET request and data is missing, we likely want to return null/undefined
      // rather than the success wrapper itself, to avoid 'truthy' checks passing incorrectly.
      if (method === "GET") {
        return {
          data: result.data ?? null,
        };
      }

      return {
        data: result.data !== undefined ? result.data : result,
      };
    }

    // If it's not a success/message/data wrapper, return the result directly
    return {
      data: result,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      error: errorMessage,
    };
  }
};
