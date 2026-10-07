"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getDeviceInstallationId } from "@/lib/device-installation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/config";

const registerCurrentDevice = async (userId: string) => {
  try {
    await fetch("/api/devices/current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceInstallationId(userId) }),
    });
  } catch {
    // Authentication remains optional while the local-first app is prepared.
  }
};

export function AuthControl() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setReady(true);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
      if (data.user) void registerCurrentDevice(data.user.id);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void registerCurrentDevice(session.user.id);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <span className="muted">Account…</span>;
  if (!hasSupabaseConfig()) return null;
  if (!user)
    return (
      <Link href="/login" className="pixel-button">
        Sign in
      </Link>
    );
  return (
    <div className="auth-control">
      <span title={user.email ?? "Signed in"}>{user.email ?? "Signed in"}</span>
      <button
        type="button"
        className="pixel-button"
        onClick={() => void createSupabaseBrowserClient().auth.signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
