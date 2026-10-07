import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig, supabaseConfig } from "./config";

export function createSupabaseServerClient() {
  if (!hasSupabaseConfig())
    throw new Error("Supabase is not configured for this deployment.");
  const cookieStore = cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; middleware refreshes sessions.
        }
      },
    },
  });
}

/** Retrieves a verified server-side user; never accepts a browser-supplied ID. */
export async function getAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}
