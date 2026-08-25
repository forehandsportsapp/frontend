"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { OrganizationData, ProfileData } from "@/lib/models";
import { organizationApi } from "@/lib/api/organizationApi";
import { userApi, type UserBootstrapData } from "@/lib/api/userApi";
import { clearApiAuthCache } from "@/lib/api/interceptor";
import { saveAuthRedirect } from "@/lib/authRedirect";

type AppContextValue = {
  session: Session | null;
  isLoading: boolean; // Supabase session restoring

  isAuthenticated: boolean;

  userProfile: ProfileData | null;
  activeOrganization: OrganizationData | null;

  login: (next?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: ProfileData) => Promise<void>;
  setOrganization: (orgId?: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const ACTIVE_ORG_STORAGE_KEY = "forehand:active-org-id";
const NATIVE_CALLBACK_URL = "com.forehand.app://auth/callback";
const BOOTSTRAP_CACHE_PREFIX = "forehand:bootstrap:";
const BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedBootstrapData = UserBootstrapData & {
  userId: string;
  storedAt: number;
};

function getBaseUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3000";
  return window.location.origin;
}

function isValidProfile(profile: unknown): profile is ProfileData {
  return Boolean(profile && typeof profile === "object" && (profile as any).name);
}

function getBootstrapCacheKey(userId: string) {
  return `${BOOTSTRAP_CACHE_PREFIX}${userId}`;
}

function readCachedBootstrap(userId: string): UserBootstrapData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(getBootstrapCacheKey(userId));
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedBootstrapData;
    if (
      cached.userId !== userId ||
      Date.now() - cached.storedAt > BOOTSTRAP_CACHE_TTL_MS ||
      !isValidProfile(cached.profile)
    ) {
      sessionStorage.removeItem(getBootstrapCacheKey(userId));
      return null;
    }

    return {
      profile: cached.profile,
      organizations: Array.isArray(cached.organizations)
        ? cached.organizations
        : [],
    };
  } catch {
    sessionStorage.removeItem(getBootstrapCacheKey(userId));
    return null;
  }
}

function writeCachedBootstrap(userId: string, bootstrap: UserBootstrapData) {
  if (typeof window === "undefined" || !isValidProfile(bootstrap.profile)) {
    return;
  }

  try {
    sessionStorage.setItem(
      getBootstrapCacheKey(userId),
      JSON.stringify({
        ...bootstrap,
        userId,
        storedAt: Date.now(),
      } satisfies CachedBootstrapData),
    );
  } catch {
  }
}

function clearCachedBootstrap(userId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    if (userId) {
      sessionStorage.removeItem(getBootstrapCacheKey(userId));
      return;
    }

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(BOOTSTRAP_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [session, setSession] = useState<Session | null>(null);

  // --- Backend profile ---
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);

  // --- Active organisation ---
  const [activeOrganization, setActiveOrganization] =
    useState<OrganizationData | null>(null);
  const activeOrgIdRef = useRef<string | null>(null);

  // Tracks which user ID we last ATTEMPTED to fetch a profile for.
  // This prevents infinite loops if the user exists in Supabase but not in our DB.
  const lastFetchedUserIdRef = useRef<string | null>(null);

  /* ---- helpers --------------------------------------------------- */

  /* ---- refreshProfile (public) ----------------------------------- */

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setUserProfile(null);
      return;
    }

    try {
      const profile = await userApi.getInfo();
      setUserProfile(profile);
      lastFetchedUserIdRef.current = userId;
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setUserProfile(null);
      lastFetchedUserIdRef.current = userId; // Still mark as attempted
    }
  }, [session]);

  /* ---- Native deep-link handler ---------------------------------- */

  const finishNativeAuth = useCallback(
    async (url: string) => {
      const parsed = new URL(url);
      const hashParams = new URLSearchParams(
        parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash,
      );

      const code = parsed.searchParams.get("code");
      const accessToken =
        parsed.searchParams.get("access_token") ??
        hashParams.get("access_token");
      const refreshToken =
        parsed.searchParams.get("refresh_token") ??
        hashParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
      } else {
        throw new Error("Unable to complete sign-in.");
      }
    },
    [supabase],
  );

  /* ================================================================ */
  /*  Public actions                                                   */
  /* ================================================================ */

  /** Initiates Google OAuth login via Supabase. */
  const login = useCallback(async (next?: string) => {
    const redirectPath = saveAuthRedirect(next);
    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? NATIVE_CALLBACK_URL
      : `${getBaseUrl()}/auth/callback?next=${encodeURIComponent(redirectPath)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: isNative,
      },
    });

    if (error) throw error;

    if (isNative && data?.url) {
      await Browser.open({ url: data.url, presentationStyle: "popover" });
    }
  }, [supabase]);

  /** Signs out, clears all local state & storage. */
  const logout = useCallback(async () => {
    const currentUserId = session?.user?.id;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearApiAuthCache();
    clearCachedBootstrap(currentUserId);

    setUserProfile(null);
    setActiveOrganization(null);
    activeOrgIdRef.current = null;

    if (typeof window !== "undefined") {
      // 1. Clear LocalStorage preserving theme
      const theme = localStorage.getItem("forehand:theme");
      localStorage.clear();
      if (theme) {
        localStorage.setItem("forehand:theme", theme);
      }

      // 2. Clear SessionStorage
      try {
        sessionStorage.clear();
      } catch (err) {
        console.warn("Failed to clear sessionStorage:", err);
      }

      // 3. Clear Cache Storage (PWA API Cache)
      if ("caches" in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        } catch (err) {
          console.warn("Failed to clear Cache Storage:", err);
        }
      }

      // 4. Clear IndexedDB 'forehand-pwa'
      if ("indexedDB" in window) {
        try {
          window.indexedDB.deleteDatabase("forehand-pwa");
        } catch (err) {
          console.warn("Failed to delete IndexedDB:", err);
        }
      }
    }
  }, [supabase]);

  /** Registers the user via the backend and re-fetches the profile. */
  const register = useCallback(
    async (profileData: ProfileData) => {
      await userApi.registerUser(profileData);

      // Re-fetch profile so userProfile is populated
      const profile = await userApi.getInfo();
      if (session?.user?.id) clearCachedBootstrap(session.user.id);
      setUserProfile(profile);
    },
    [session],
  );

  /** Sets or clears the active organisation. Persists in localStorage. */
  const setOrganization = useCallback(
    async (orgId?: string | null) => {
      activeOrgIdRef.current = orgId || "";

      if (typeof window !== "undefined") {
        if (orgId) localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
        else localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }

      if (!orgId) {
        setActiveOrganization(null);
        return;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        setActiveOrganization(null);
        return;
      }

      try {
        const orgs = await organizationApi.getUserOrganizations();
        const matched = orgs.find((org) => org.id === orgId) || null;
        if (!matched) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
          }
          activeOrgIdRef.current = null;
          setActiveOrganization(null);
          return;
        }
        setActiveOrganization(matched);
      } catch (error) {
        console.error("Failed to set organization:", error);
        setActiveOrganization(null);
      }
    },
    [session],
  );

  /* ================================================================ */
  /*  Effects                                                          */
  /* ================================================================ */

  // 1. Unified Auth & Profile initialization
  useEffect(() => {
    let appUrlOpenListener: { remove: () => Promise<void> } | null = null;
    let isInitialMount = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(initialSession);
      } catch (err) {
        console.error("Failed to initialize app session:", err);
        setSession(null);
      } finally {
        setHasRestoredSession(true);
        isInitialMount = false;
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        clearApiAuthCache();
      }
      setHasRestoredSession(true);
      if (!isInitialMount) {
        setSession((prev) => {
          if (prev?.user?.id !== nextSession?.user?.id) {
            setIsLoading(true);
          }
          return nextSession;
        });
      }
    });

    // Native deep-link handler
    if (Capacitor.isNativePlatform()) {
      void App.addListener(
        "appUrlOpen",
        async (event: URLOpenListenerEvent) => {
          if (!event.url.startsWith(NATIVE_CALLBACK_URL)) return;
          try {
            await finishNativeAuth(event.url);
            await Browser.close();
          } catch (err) {
            console.error("Failed to complete native login", err);
          }
        },
      ).then((listener) => {
        appUrlOpenListener = listener;
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlOpenListener) void appUrlOpenListener.remove();
    };
  }, [supabase, finishNativeAuth]);

  // 2. Respond to ANY session change
  useEffect(() => {
    if (!hasRestoredSession) return;

    const userId = session?.user?.id || null;
    let cancelled = false;

    const applyBootstrap = (bootstrap: UserBootstrapData) => {
      const profile = bootstrap?.profile ?? null;

      if (!isValidProfile(profile)) {
        setUserProfile(null);
        setActiveOrganization(null);
        activeOrgIdRef.current = null;
        return false;
      }

      setUserProfile(profile);

      if (typeof window !== "undefined") {
        const orgs = Array.isArray(bootstrap.organizations)
          ? bootstrap.organizations
          : [];
        const storedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
        const matched =
          orgs.find((o) => o.id === storedOrgId) || orgs[0] || null;

        setActiveOrganization(matched);
        activeOrgIdRef.current = matched?.id || null;

        if (matched?.id) {
          localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, matched.id);
        } else {
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
        }
      }

      return true;
    };

    // A. User logged out or no session
    if (!userId) {
      clearApiAuthCache();
      clearCachedBootstrap();
      setUserProfile(null);
      setActiveOrganization(null);
      activeOrgIdRef.current = null;
      lastFetchedUserIdRef.current = null;
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    // B. New user detected (initial load or sign-in)
    if (userId !== lastFetchedUserIdRef.current) {
      void (async () => {
        const cachedBootstrap = readCachedBootstrap(userId);

        try {
          setIsLoading(!cachedBootstrap);
          lastFetchedUserIdRef.current = userId;

          if (cachedBootstrap) {
            applyBootstrap(cachedBootstrap);
            setIsLoading(false);
          }

          const bootstrap = await userApi.getBootstrap();
          if (cancelled) return;

          if (applyBootstrap(bootstrap)) {
            writeCachedBootstrap(userId, bootstrap);
          } else if (!cachedBootstrap) {
            clearCachedBootstrap(userId);
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
          if (cancelled) return;
          if (!cachedBootstrap) {
            setUserProfile(null);
            setActiveOrganization(null);
            activeOrgIdRef.current = null;
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    } else {
      // Same user, no need to re-fetch profile.
      // Ensure we're not stuck in loading if onAuthStateChange set it to true.
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [hasRestoredSession, session]);

  /* ---- context value --------------------------------------------- */

  const value = useMemo<AppContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(session?.user),
      userProfile,
      activeOrganization,
      login,
      logout,
      register,
      session,
      setOrganization,
      refreshProfile,
    }),
    [
      isLoading,
      userProfile,
      activeOrganization,
      login,
      logout,
      register,
      session,
      setOrganization,
      refreshProfile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an <AppProvider>");
  return ctx;
}
