"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import FullScreenAuthLoader from "@/components/FullScreenAuthLoader";
import { withAuthRedirect } from "@/lib/authRedirect";

export default function LaunchPage() {
  const router = useRouter();
  const { authStatus, authError, retryAuth, logout } = useApp();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (authStatus === "ready") {
      router.replace("/user/home");
      return;
    }

    if (authStatus === "profile-required") {
      router.replace(withAuthRedirect("/register", "/user/home"));
      return;
    }

    if (authStatus === "signed-out") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

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
