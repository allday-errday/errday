"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { signup } from "./actions";

export function SignupForm() {
  const [state, formAction] = useActionState(signup, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <Field label="Email">
        <input
          autoComplete="email"
          className={inputClassName()}
          name="email"
          placeholder="you@errday.app"
          required
          type="email"
        />
      </Field>
      <Field label="Password">
        <input
          autoComplete="new-password"
          className={inputClassName()}
          minLength={6}
          name="password"
          required
          type="password"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link className="font-semibold text-[var(--accent)]" href="/login">
          Log in
        </Link>
      </p>
    </form>
  );
}
