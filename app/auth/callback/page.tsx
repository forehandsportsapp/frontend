"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { userApi } from "@/lib/api/userApi";
import {
  consumeAuthRedirect,
  saveAuthRedirect,
  withAuthRedirect,
} from "@/lib/authRedirect";

/**
 * Handles the Google OAuth PKCE callback.
 * Exchanges the `code` param for a session, then redirects
 * to /register (new user) or the original destination (returning user).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const didRun = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const supabase = getSupabaseBrowserClient();

    const completeAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const nextPath = saveAuthRedirect(url.searchParams.get("next"));

        if (!code) throw new Error("No auth code found in URL.");

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;

        try {
          const profile = await userApi.getInfo();
          if (profile) {
            router.replace(consumeAuthRedirect(nextPath));
            return;
          }
        } catch (apiError) {
          // If profile fetch fails, we assume user needs to register
          console.error("Profile fetch failed:", apiError);
        }

        router.replace(withAuthRedirect("/register", nextPath));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to complete sign-in.",
        );
      }
    };

    void completeAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          Signing you in...
        </h1>
        {error ? (
          <>
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => router.replace("/login")}
              className="text-sm text-primary underline"
            >
              Back to login
            </button>
          </>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            Please wait a moment...
          </p>
        )}
      </div>
    </div>
  );
}
