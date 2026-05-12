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
import { userApi } from "@/lib/api/userApi";

type AppContextValue = {
  session: Session | null;
  isLoading: boolean; // Supabase session restoring

  isAuthenticated: boolean;

  userProfile: ProfileData | null;
  activeOrganization: OrganizationData | null;

  login: () => Promise<void>;
  logout: () => Promise<void>;
  register: (data: ProfileData) => Promise<void>;
  setOrganization: (orgId?: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const ACTIVE_ORG_STORAGE_KEY = "forehand:active-org-id";
const NATIVE_CALLBACK_URL = "com.forehand.app://auth/callback";

function getBaseUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3000";
  return window.location.origin;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [session, setSession] = useState<Session | null>(null);

  // --- Backend profile ---
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const login = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? NATIVE_CALLBACK_URL
      : `${getBaseUrl()}/auth/callback`;

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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setUserProfile(null);
    setActiveOrganization(null);
    activeOrgIdRef.current = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }
  }, [supabase]);

  /** Registers the user via the backend and re-fetches the profile. */
  const register = useCallback(
    async (profileData: ProfileData) => {
      await userApi.registerUser(profileData);

      // Re-fetch profile so userProfile is populated
      const profile = await userApi.getInfo();
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

        if (initialSession) {
          setSession(initialSession);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize app session:", err);
        setIsLoading(false);
      } finally {
        isInitialMount = false;
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
    const userId = session?.user?.id || null;

    // A. User logged out or no session
    if (!userId) {
      setUserProfile(null);
      setActiveOrganization(null);
      activeOrgIdRef.current = null;
      lastFetchedUserIdRef.current = null;
      setIsLoading(false);
      return;
    }

    // B. New user detected (initial load or sign-in)
    if (userId !== lastFetchedUserIdRef.current) {
      void (async () => {
        try {
          setIsLoading(true);
          lastFetchedUserIdRef.current = userId;

          const profile = await userApi.getInfo();

          // VALIDATION: Ensure it's a real profile and not just a success message
          if (profile && typeof profile === "object" && profile.name) {
            setUserProfile(profile);

            if (typeof window !== "undefined") {
              const orgs = await organizationApi.getUserOrganizations();
              const storedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
              const matched =
                orgs.find((o) => o.id === storedOrgId) || orgs[0] || null;

              setActiveOrganization(matched);
              activeOrgIdRef.current = matched?.id || null;
            }
          } else {
            // No valid profile found
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
          setUserProfile(null);
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      // Same user, no need to re-fetch profile.
      // Ensure we're not stuck in loading if onAuthStateChange set it to true.
      setIsLoading(false);
    }
  }, [session]);

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
