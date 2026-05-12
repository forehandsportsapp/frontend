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
    method?: "POST" | "GET" | "PUT" | "DELETE";
    contentType?: "json";
    body?: any;
    silent?: boolean;
  } = {},
): Promise<ParsedRespone> => {
  const requestStartedAt = Date.now();
  try {
    const supabaseClient = getSupabaseBrowserClient();
    const session = await supabaseClient.auth.getSession();
    const accessToken = session.data.session?.access_token;

    let headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

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

      if (!silent) {
        console.error("[fetchApi] non-2xx response", {
          path,
          method,
          status: res.status,
          statusText: res.statusText,
          response: result,
        });
      }
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
    const browserContext =
      typeof window !== "undefined"
        ? {
            href: window.location.href,
            origin: window.location.origin,
            online: window.navigator.onLine,
          }
        : null;

    const detailedError =
      e instanceof Error
        ? {
            name: e.name,
            message: e.message,
            stack: e.stack,
            cause: (e as any).cause ?? null,
          }
        : { raw: String(e) };

    if (!silent) {
      console.error(`[fetchApi] ${method} ${path} failed`, {
        method,
        path,
        durationMs: Date.now() - requestStartedAt,
        contentType: contentType ?? null,
        hasBody: body !== undefined,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? null,
        browserContext,
        error: detailedError,
      });
      console.error(`[fetchApi] ${method} ${path} failed:`, errorMessage);
    }
    return {
      error: errorMessage,
    };
  }
};
