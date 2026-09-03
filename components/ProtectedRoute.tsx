"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import FullScreenAuthLoader from "@/components/FullScreenAuthLoader";
import { getAuthDestination } from "@/lib/authRedirect";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { authStatus, authError, retryAuth, logout } = useApp();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (authStatus === "signed-out" || authStatus === "profile-required") {
      const requestedPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname || "/";
      const destination = getAuthDestination(authStatus, requestedPath);
      if (destination) router.replace(destination);
    }
  }, [authStatus, pathname, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (authStatus === "ready") {
    return <>{children}</>;
  }

  if (authStatus === "error" || authStatus === "access-denied") {
    return (
      <FullScreenAuthLoader
        error={
          authStatus === "access-denied"
            ? "You are signed in, but this account is not allowed to access this area."
            : authError || "Unable to verify your session."
        }
        onRetry={retryAuth}
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
      />
    );
  }

  return <FullScreenAuthLoader />;
}
