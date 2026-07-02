"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, inputClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/forms";
import { login } from "./actions";

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialActionState);

  return (
    <form action={formAction} className="grid gap-4">
      <input
        aria-hidden="true"
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        name="website"
        tabIndex={-1}
        type="text"
      />
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
          autoComplete="current-password"
          className={inputClassName()}
          name="password"
          required
          type="password"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Signing in...">Log in</SubmitButton>
      <p className="text-center text-sm text-zinc-500">
        No account yet?{" "}
        <Link className="font-semibold text-[var(--accent)]" href="/signup">
          Sign up
        </Link>
      </p>
    </form>
  );
}
