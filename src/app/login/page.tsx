"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell";
import { PixelButton, PixelCard } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signIn = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: authError } =
        await createSupabaseBrowserClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
      if (authError) throw authError;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Sign-in could not start.",
      );
      setLoading(false);
    }
  };
  return (
    <AppShell title="Account">
      <PixelCard>
        <h2>Sign in</h2>
        <p>
          Sign in to prepare this device for future multi-device COUNT//DOWN
          sync. Your existing local countdowns stay on this device for now.
        </p>
        {!hasSupabaseConfig() ? (
          <p className="notice">Account sign-in is not configured yet.</p>
        ) : (
          <PixelButton onClick={signIn} disabled={loading}>
            {loading ? "Opening Google…" : "Continue with Google"}
          </PixelButton>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
      </PixelCard>
    </AppShell>
  );
}
