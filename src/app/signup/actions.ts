"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/forms";
import { formString } from "@/lib/forms";

export async function signup(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." };
  }

  if (password.length < 6) {
    return {
      status: "error",
      message: "Password must be at least 6 characters.",
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

  redirect("/today");
}
