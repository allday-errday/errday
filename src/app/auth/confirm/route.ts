import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email confirmation lands here (see the "Confirm signup" template in
// Supabase): verifies the token server-side, signs the user in and sends
// them straight into onboarding with a welcome toast.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(
        new URL("/onboarding?toast=confirmed", url.origin),
      );
    }
  }

  // Expired or already-used link: logging in tells the user what's up.
  return NextResponse.redirect(new URL("/login", url.origin));
}
