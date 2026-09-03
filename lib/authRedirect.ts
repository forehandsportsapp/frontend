import { toQuery } from "@/lib/utils";

export const AUTH_REDIRECT_STORAGE_KEY = "forehand:auth-redirect";

export const DEFAULT_AUTH_REDIRECT = "/user/home";

export type AuthStatus =
  | "initializing"
  | "loading-profile"
  | "signed-out"
  | "profile-required"
  | "ready"
  | "error"
  | "access-denied";

export function normalizeAuthRedirect(value?: string | null): string {
  if (!value) return DEFAULT_AUTH_REDIRECT;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (
    decoded.startsWith("/") &&
    !decoded.startsWith("//") &&
    !decoded.startsWith("/auth/callback") &&
    !decoded.startsWith("/login") &&
    !decoded.startsWith("/register")
  ) {
    return decoded;
  }

  return DEFAULT_AUTH_REDIRECT;
}

function getRawQueryParam(url: string, name: string): string | null {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return null;

  const hashStart = url.indexOf("#", queryStart);
  const query =
    hashStart === -1
      ? url.slice(queryStart + 1)
      : url.slice(queryStart + 1, hashStart);

  for (const part of query.split("&")) {
    const [rawKey, ...rawValueParts] = part.split("=");
    try {
      if (decodeURIComponent(rawKey.replace(/\+/g, " ")) === name) {
        return rawValueParts.join("=");
      }
    } catch {
    }
  }

  return null;
}

export function getCurrentAuthRedirect(): string {
  if (typeof window === "undefined") return DEFAULT_AUTH_REDIRECT;
  return normalizeAuthRedirect(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function getAuthRedirectFromUrl(): string {
  if (typeof window === "undefined") return DEFAULT_AUTH_REDIRECT;
  const next = getRawQueryParam(window.location.href, "next");
  if (!next) {
    return normalizeAuthRedirect(
      sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY),
    );
  }
  return normalizeAuthRedirect(
    next,
  );
}

export function saveAuthRedirect(next?: string | null): string {
  const redirectPath = normalizeAuthRedirect(next);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirectPath);
  }
  return redirectPath;
}

export function consumeAuthRedirect(fallback?: string | null): string {
  const fallbackPath = normalizeAuthRedirect(fallback);
  if (typeof window === "undefined") return fallbackPath;

  const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return normalizeAuthRedirect(stored || fallbackPath);
}

export function getStoredAuthRedirect(fallback?: string | null): string {
  const fallbackPath = normalizeAuthRedirect(fallback);
  if (typeof window === "undefined") return fallbackPath;
  return normalizeAuthRedirect(
    sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY) || fallbackPath,
  );
}

export function withAuthRedirect(path: "/login" | "/register", next: string) {
  return `${path}${toQuery({ next: normalizeAuthRedirect(next) })}`;
}

export function getAuthDestination(
  status: AuthStatus,
  requestedPath?: string | null,
): string | null {
  const next = normalizeAuthRedirect(requestedPath);

  switch (status) {
    case "ready":
      return next;
    case "profile-required":
      return withAuthRedirect("/register", next);
    case "signed-out":
      return withAuthRedirect("/login", next);
    default:
      return null;
  }
}
