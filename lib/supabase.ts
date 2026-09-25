"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const clientSingletons: Partial<Record<"pkce", SupabaseClient>> = {};

export function getSupabaseBrowserClient() {
  const flowType = "pkce";
  const existingClient = clientSingletons[flowType];
  if (existingClient) return existingClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  clientSingletons[flowType] = client;
  return client;
}

function getAuthParams(url: string) {
  const parsed = new URL(url);
  const hashParams = new URLSearchParams(
    parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash,
  );

  const getParam = (name: string) =>
    parsed.searchParams.get(name) ?? hashParams.get(name);

  return {
    code: getParam("code"),
    accessToken: getParam("access_token"),
    refreshToken: getParam("refresh_token"),
    error: getParam("error"),
    errorDescription: getParam("error_description"),
  };
}

export async function completeSupabaseAuthFromUrl(url: string) {
  const supabase = getSupabaseBrowserClient();
  const { code, accessToken, refreshToken, error, errorDescription } =
    getAuthParams(url);

  if (error || errorDescription) {
    throw new Error(errorDescription || error || "Unable to complete sign-in.");
  }

  if (accessToken && refreshToken) {
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setSessionError) throw setSessionError;
    return;
  }

  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return;
  }

  throw new Error("Unable to complete sign-in.");
}
