"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (!hasSupabaseConfig())
    throw new Error("Supabase is not configured for this deployment.");
  browserClient ??= createBrowserClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
  );
  return browserClient;
}
