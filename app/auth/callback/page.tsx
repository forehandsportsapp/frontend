"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import FullScreenAuthLoader from "@/components/FullScreenAuthLoader";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  getAuthRedirectFromUrl,
  getAuthDestination,
  saveAuthRedirect,
} from "@/lib/authRedirect";

export default function AuthCallbackPage() {
  const router = useRouter();
  const didExchange = useRef(false);
  const { authStatus, authError, retryAuth, logout } = useApp();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/user/home");
  const [hasCompletedExchange, setHasCompletedExchange] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (didExchange.current) return;
    didExchange.current = true;

    const completeAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const redirectPath = saveAuthRedirect(getAuthRedirectFromUrl());
        setNextPath(redirectPath);

        if (!code) throw new Error("No auth code found in URL.");

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        await retryAuth();
        setHasCompletedExchange(true);
      } catch (cause) {
        setExchangeError(
          cause instanceof Error
            ? cause.message
            : "Unable to complete sign-in.",
        );
      }
    };

    void completeAuth();
  }, [retryAuth]);

  useEffect(() => {
    if (!hasCompletedExchange) return;

    const destination = getAuthDestination(authStatus, nextPath);
    if (destination) router.replace(destination);
  }, [authStatus, hasCompletedExchange, nextPath, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (exchangeError || authStatus === "error" || authStatus === "access-denied") {
    return (
      <FullScreenAuthLoader
        error={
          exchangeError ||
          (authStatus === "access-denied"
            ? "You are signed in, but this account is not allowed to access the app."
            : authError || "Unable to verify your session.")
        }
        onRetry={exchangeError ? undefined : retryAuth}
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
      />
    );
  }

  return (
    <FullScreenAuthLoader
      title="Signing you in"
      message="Please wait a moment..."
    />
  );
}
