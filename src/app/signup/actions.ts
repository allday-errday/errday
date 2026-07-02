"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/forms";
import { formString } from "@/lib/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

function isSignupAllowed(email: string) {
  const allowlist = process.env.ALLOWED_SIGNUP_EMAILS?.trim();
  if (!allowlist) return true;

  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function signup(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Honeypot: real users never see or fill this field.
  if (formString(formData, "website")) {
    return { status: "error", message: "Could not create account." };
  }

  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  const ip = await getClientIp();
  const ipLimit = checkRateLimit(`signup:ip:${ip}`, 5, 60 * 60);
  if (!ipLimit.allowed) {
    return {
      status: "error",
      message: "Too many signup attempts. Please try again later.",
    };
  }

  if (!isSignupAllowed(email)) {
    return {
      status: "error",
      message: "Signups are currently invite-only.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data.session) {
    return {
      status: "success",
      message: "Check your email to confirm your account, then log in.",
    };
  }

  redirect("/onboarding");
}
