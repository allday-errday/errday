import { NextResponse, type NextRequest } from "next/server";
import { safeSameOriginRedirect } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destination = safeSameOriginRedirect(
    requestUrl.searchParams.get("next"),
    requestUrl.origin,
  );

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(destination);
}
