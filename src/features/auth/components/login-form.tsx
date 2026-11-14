"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "@/features/auth/actions";

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground " +
  "placeholder:text-muted-foreground focus-visible:border-royal focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-royal/40 aria-invalid:border-destructive";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} noValidate className="mt-6 space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="admin-email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={
            state.fieldErrors?.email ? "admin-email-error" : undefined
          }
          className={inputClass}
        />
        {state.fieldErrors?.email ? (
          <p id="admin-email-error" className="text-sm text-destructive">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="admin-password" className="text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state.fieldErrors?.password ? "admin-password-error" : undefined
          }
          className={inputClass}
        />
        {state.fieldErrors?.password ? (
          <p id="admin-password-error" className="text-sm text-destructive">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-royal px-4 text-sm font-medium text-white transition-colors hover:bg-royal/90 focus-visible:ring-2 focus-visible:ring-royal/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
