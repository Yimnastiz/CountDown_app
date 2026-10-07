import { NextResponse } from "next/server";
import { safeAuthRedirect } from "@/lib/auth-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeAuthRedirect(url.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", url));
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(new URL(next, url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", url));
  }
}
