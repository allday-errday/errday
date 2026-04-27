"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/forms";
import { formString } from "@/lib/forms";

export async function login(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = formString(formData, "email");
  const password = formString(formData, "password");

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." };
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
