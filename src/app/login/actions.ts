"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/forms";
import { formString } from "@/lib/forms";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export async function login(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Honeypot: real users never see or fill this field.
  if (formString(formData, "website")) {
    return { status: "error", message: "Invalid email or password." };
  }

  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." };
  }

  const ip = await getClientIp();
  const ipLimit = checkRateLimit(`login:ip:${ip}`, 10, 15 * 60);
  const emailLimit = checkRateLimit(
    `login:email:${email.toLowerCase()}`,
    10,
    15 * 60,
  );

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return {
      status: "error",
      message: "Too many login attempts. Please try again in a few minutes.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/today");
}
