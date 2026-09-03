"use client";

import React from "react";

type FullScreenAuthLoaderProps = {
  title?: string;
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  onSignOut?: () => void;
  isSigningOut?: boolean;
};

export default function FullScreenAuthLoader({
  title = "Checking your session",
  message = "Please wait a moment...",
  error,
  onRetry,
  onSignOut,
  isSigningOut = false,
}: FullScreenAuthLoaderProps) {
  const hasError = Boolean(error);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--color-background)] px-6 text-center">
      <div className="w-full max-w-sm space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ff7a1a]/10">
          {hasError ? (
            <span className="text-3xl font-black text-[#ff7a1a]">!</span>
          ) : (
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#ff7a1a] border-t-transparent" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            {hasError ? "Session check failed" : title}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {hasError ? error : message}
          </p>
        </div>

        {hasError && (onRetry || onSignOut) ? (
          <div className="flex flex-col gap-3 pt-2">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="h-12 rounded-full bg-[#ff7a1a] px-5 text-sm font-bold text-white transition-colors hover:bg-[#ff8a33]"
              >
                Try again
              </button>
            ) : null}
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                disabled={isSigningOut}
                className="h-12 rounded-full border border-[var(--color-border)] px-5 text-sm font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
