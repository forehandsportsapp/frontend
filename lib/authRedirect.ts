import { toQuery } from "@/lib/utils";

export const AUTH_REDIRECT_STORAGE_KEY = "forehand:auth-redirect";

const DEFAULT_AUTH_REDIRECT = "/home";

export function normalizeAuthRedirect(value?: string | null): string {
  if (!value) return DEFAULT_AUTH_REDIRECT;

  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("/") &&
      !decoded.startsWith("//") &&
      !decoded.startsWith("/auth/callback") &&
      !decoded.startsWith("/login") &&
      !decoded.startsWith("/register")
    ) {
      return decoded;
    }
  } catch {
    // Fall through to raw value validation below.
  }

  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/auth/callback") &&
    !value.startsWith("/login") &&
    !value.startsWith("/register")
  ) {
    return value;
  }

  return DEFAULT_AUTH_REDIRECT;
}

export function getCurrentAuthRedirect(): string {
  if (typeof window === "undefined") return DEFAULT_AUTH_REDIRECT;
  return normalizeAuthRedirect(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function getAuthRedirectFromUrl(): string {
  if (typeof window === "undefined") return DEFAULT_AUTH_REDIRECT;
  const next = new URL(window.location.href).searchParams.get("next");
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
