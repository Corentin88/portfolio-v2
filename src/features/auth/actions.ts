"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { requireAdmin } from "@/features/auth/require-admin";
import { loginInputSchema } from "@/features/auth/schemas";
import { revokeAdminSessions } from "@/features/auth/session";

export type LoginFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  email?: string;
};

const INVALID_CREDENTIALS = "Identifiants incorrects.";
const RATE_LIMITED = "Trop de tentatives. Réessayez dans quelques minutes.";

export async function loginAction(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = loginInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      email: raw.email,
      fieldErrors: { email: fields.email?.[0], password: fields.password?.[0] },
    };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/admin" });
  } catch (error) {
    // signIn signale le succès par une redirection (exception de Next) : on la laisse passer.
    if (!(error instanceof AuthError)) throw error;
    const rateLimited = "code" in error && error.code === "rate_limited";
    return {
      email: parsed.data.email,
      error: rateLimited ? RATE_LIMITED : INVALID_CREDENTIALS,
    };
  }
  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}

/** Déconnecte toutes les sessions du compte, sur tous les appareils. */
export async function revokeAllSessionsAction(): Promise<void> {
  const admin = await requireAdmin();
  await revokeAdminSessions(admin.id);
  await signOut({ redirectTo: "/admin/login" });
}
