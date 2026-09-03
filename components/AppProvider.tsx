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
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { OrganizationData, ProfileData } from "@/lib/models";
import { organizationApi } from "@/lib/api/organizationApi";
import { userApi, type UserBootstrapData } from "@/lib/api/userApi";
import {
  clearApiAuthCache,
  fetchApi,
  getApiUrl,
} from "@/lib/api/interceptor";
import {
  AUTH_REDIRECT_STORAGE_KEY,
  type AuthStatus,
  saveAuthRedirect,
} from "@/lib/authRedirect";

type AppContextValue = {
  session: Session | null;
  authStatus: AuthStatus;
  authError: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userProfile: ProfileData | null;
  activeOrganization: OrganizationData | null;
  login: (next?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: ProfileData) => Promise<void>;
  setOrganization: (orgId?: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

const ACTIVE_ORG_STORAGE_KEY = "forehand:active-org-id";
const LEGACY_ACTIVE_ORG_SESSION_KEY = "forehand:active-org";
const NATIVE_CALLBACK_URL = "com.forehand.app://auth/callback";
const BOOTSTRAP_CACHE_PREFIX = "forehand:bootstrap:";

type CachedBootstrapData = UserBootstrapData & {
  userId: string;
  storedAt: number;
};

class BootstrapError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BootstrapError";
    this.status = status;
  }
}

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

function clearForehandSessionStorage() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_ACTIVE_ORG_SESSION_KEY);
    clearCachedBootstrap();
  } catch {
  }
}

function clearForehandLocalStorage() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
  } catch {
  }
}

function getErrorStatus(error: unknown) {
  return error instanceof BootstrapError ? error.status : undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "Unable to verify your session.");
}

function isValidBootstrapPayload(data: unknown): data is UserBootstrapData {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Partial<UserBootstrapData>;
  if (!("profile" in candidate)) return false;
  if (
    candidate.profile !== null &&
    candidate.profile !== undefined &&
    !isValidProfile(candidate.profile)
  ) {
    return false;
  }
  return Array.isArray(candidate.organizations);
}

async function deleteForehandIndexedDb() {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;

  try {
    window.indexedDB.deleteDatabase("forehand-pwa");
  } catch (err) {
    console.warn("Failed to delete Forehand IndexedDB:", err);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [session, setSessionState] = useState<Session | null>(null);
  const [authStatus, setAuthStatusState] =
    useState<AuthStatus>("initializing");
  const [authError, setAuthError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [activeOrganization, setActiveOrganization] =
    useState<OrganizationData | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const authStatusRef = useRef<AuthStatus>("initializing");
  const authGenerationRef = useRef(0);
  const activeOrgIdRef = useRef<string | null>(null);
  const lastBootstrappedUserIdRef = useRef<string | null>(null);
  const pendingBootstrapRef = useRef<{
    userId: string;
    promise: Promise<UserBootstrapData>;
  } | null>(null);

  const setSession = useCallback((nextSession: Session | null) => {
    sessionRef.current = nextSession;
    setSessionState(nextSession);
  }, []);

  const setAuthStatus = useCallback((nextStatus: AuthStatus) => {
    authStatusRef.current = nextStatus;
    setAuthStatusState(nextStatus);
  }, []);

  const resetUserState = useCallback(() => {
    setUserProfile(null);
    setActiveOrganization(null);
    activeOrgIdRef.current = null;
    lastBootstrappedUserIdRef.current = null;
  }, []);

  const fetchBootstrap = useCallback(
    async (userId: string, dedupe = true): Promise<UserBootstrapData> => {
      const pending = pendingBootstrapRef.current;
      if (dedupe && pending?.userId === userId) return pending.promise;

      const promise = fetchApi(getApiUrl({ path: "/user/bootstrap" })).then(
        ({ data, error, status }) => {
          if (error) {
            throw new BootstrapError(String(error), status);
          }

          if (!isValidBootstrapPayload(data)) {
            throw new BootstrapError(
              "The server returned an unexpected session profile response.",
            );
          }

          return {
            profile: data.profile ?? null,
            organizations: data.organizations,
          };
        },
      );

      pendingBootstrapRef.current = { userId, promise };

      return promise.finally(() => {
        if (pendingBootstrapRef.current?.promise === promise) {
          pendingBootstrapRef.current = null;
        }
      });
    },
    [],
  );

  const applyBootstrap = useCallback(
    (userId: string, bootstrap: UserBootstrapData) => {
      const profile = bootstrap.profile ?? null;

      if (!isValidProfile(profile)) {
        setUserProfile(null);
        setActiveOrganization(null);
        activeOrgIdRef.current = null;
        lastBootstrappedUserIdRef.current = userId;
        clearCachedBootstrap(userId);
        setAuthStatus("profile-required");
        return;
      }

      setUserProfile(profile);
      lastBootstrappedUserIdRef.current = userId;
      writeCachedBootstrap(userId, bootstrap);

      const orgs = Array.isArray(bootstrap.organizations)
        ? bootstrap.organizations
        : [];
      const storedOrgId =
        typeof window !== "undefined"
          ? localStorage.getItem(ACTIVE_ORG_STORAGE_KEY)
          : null;
      const matched = orgs.find((o) => o.id === storedOrgId) || orgs[0] || null;

      setActiveOrganization(matched);
      activeOrgIdRef.current = matched?.id || null;

      if (typeof window !== "undefined") {
        if (matched?.id) {
          localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, matched.id);
        } else {
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
        }
      }

      setAuthStatus("ready");
    },
    [setAuthStatus],
  );

  const clearAuthState = useCallback(() => {
    authGenerationRef.current += 1;
    clearApiAuthCache();
    pendingBootstrapRef.current = null;
    setSession(null);
    resetUserState();
    setAuthError(null);
    setAuthStatus("signed-out");
  }, [resetUserState, setAuthStatus, setSession]);

  const logout = useCallback(async () => {
    clearAuthState();
    clearForehandSessionStorage();
    clearForehandLocalStorage();
    await deleteForehandIndexedDb();

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [clearAuthState, supabase]);

  const resolveSession = useCallback(
    async (
      nextSession: Session | null,
      {
        force = false,
        retryStaleToken = true,
      }: { force?: boolean; retryStaleToken?: boolean } = {},
    ) => {
      const generation = ++authGenerationRef.current;
      setSession(nextSession);
      setAuthError(null);

      const userId = nextSession?.user?.id || null;
      if (!userId) {
        clearApiAuthCache();
        pendingBootstrapRef.current = null;
        resetUserState();
        setAuthStatus("signed-out");
        return;
      }

      if (
        lastBootstrappedUserIdRef.current &&
        lastBootstrappedUserIdRef.current !== userId
      ) {
        resetUserState();
        clearCachedBootstrap();
        clearForehandLocalStorage();
      }

      const currentStatus = authStatusRef.current;
      const alreadyResolved =
        lastBootstrappedUserIdRef.current === userId &&
        (currentStatus === "ready" || currentStatus === "profile-required");

      if (!force && alreadyResolved) return;

      setAuthStatus("loading-profile");

      try {
        const bootstrap = await fetchBootstrap(userId);
        if (generation !== authGenerationRef.current) return;
        applyBootstrap(userId, bootstrap);
      } catch (error) {
        if (generation !== authGenerationRef.current) return;

        const status = getErrorStatus(error);

        if (status === 401 && retryStaleToken) {
          try {
            clearApiAuthCache();
            const { data, error: refreshError } =
              await supabase.auth.refreshSession();

            if (generation !== authGenerationRef.current) return;
            if (refreshError || !data.session) {
              await logout();
              return;
            }

            setSession(data.session);
            const refreshedUserId = data.session.user.id;
            const retryBootstrap = await fetchBootstrap(refreshedUserId, false);
            if (generation !== authGenerationRef.current) return;
            applyBootstrap(refreshedUserId, retryBootstrap);
            return;
          } catch (retryError) {
            if (generation !== authGenerationRef.current) return;
            if (getErrorStatus(retryError) === 401) {
              await logout();
              return;
            }

            setAuthError(getErrorMessage(retryError));
            setAuthStatus(
              getErrorStatus(retryError) === 403 ? "access-denied" : "error",
            );
            return;
          }
        }

        setAuthError(getErrorMessage(error));
        setAuthStatus(status === 403 ? "access-denied" : "error");
      }
    },
    [
      applyBootstrap,
      fetchBootstrap,
      logout,
      resetUserState,
      setAuthStatus,
      setSession,
      supabase,
    ],
  );

  const retryAuth = useCallback(async () => {
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      setAuthError(error.message);
      setAuthStatus("error");
      return;
    }

    await resolveSession(currentSession, { force: true });
  }, [resolveSession, setAuthStatus, supabase]);

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

  const login = useCallback(
    async (next?: string) => {
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
    },
    [supabase],
  );

  const register = useCallback(
    async (profileData: ProfileData) => {
      await userApi.registerUser(profileData);
      await resolveSession(sessionRef.current, { force: true });
    },
    [resolveSession],
  );

  const refreshProfile = useCallback(async () => {
    await resolveSession(sessionRef.current, { force: true });
  }, [resolveSession]);

  const setOrganization = useCallback(async (orgId?: string | null) => {
    activeOrgIdRef.current = orgId || "";

    if (typeof window !== "undefined") {
      if (orgId) localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
      else localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    }

    if (!orgId) {
      setActiveOrganization(null);
      return;
    }

    const accessToken = sessionRef.current?.access_token;
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
  }, []);

  useEffect(() => {
    let appUrlOpenListener: { remove: () => Promise<void> } | null = null;
    let mounted = true;

    const initialize = async () => {
      try {
        setAuthStatus("initializing");
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        await resolveSession(initialSession, { force: true });
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to initialize app session:", err);
        setSession(null);
        resetUserState();
        setAuthError(getErrorMessage(err));
        setAuthStatus("error");
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession) => {
        const previousUserId = sessionRef.current?.user?.id || null;
        const nextUserId = nextSession?.user?.id || null;
        setSession(nextSession);

        if (!nextSession) {
          clearApiAuthCache();
          authGenerationRef.current += 1;
          pendingBootstrapRef.current = null;
          resetUserState();
          setAuthError(null);
          setAuthStatus("signed-out");
          return;
        }

        if (
          event === "SIGNED_IN" ||
          event === "USER_UPDATED" ||
          previousUserId !== nextUserId
        ) {
          void resolveSession(nextSession, {
            force: previousUserId !== nextUserId,
          });
        }
      },
    );

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
      mounted = false;
      subscription.unsubscribe();
      if (appUrlOpenListener) void appUrlOpenListener.remove();
    };
  }, [
    finishNativeAuth,
    resetUserState,
    resolveSession,
    setAuthStatus,
    setSession,
    supabase,
  ]);

  const isLoading =
    authStatus === "initializing" || authStatus === "loading-profile";

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      authStatus,
      authError,
      isLoading,
      isAuthenticated: authStatus === "ready" || authStatus === "profile-required",
      userProfile,
      activeOrganization,
      login,
      logout,
      register,
      setOrganization,
      refreshProfile,
      retryAuth,
    }),
    [
      activeOrganization,
      authError,
      authStatus,
      isLoading,
      login,
      logout,
      refreshProfile,
      register,
      retryAuth,
      session,
      setOrganization,
      userProfile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an <AppProvider>");
  return ctx;
}
