import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/today";
  // Only same-origin paths — "https://..." and "//host" would be an
  // open redirect after login.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/today";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
