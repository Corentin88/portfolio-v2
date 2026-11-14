import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

export type CurrentAdmin = {
  id: string;
  name: string;
  email: string;
};

/**
 * Administrateur connecté, ou null — sans redirection. Pour les Route Handlers qui
 * servent aussi des visiteurs (/media : un brouillon n'est visible que connecté).
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  // Rendu forcé à la requête : Auth.js tire des valeurs aléatoires en lisant la
  // session, ce que cacheComponents refuse pendant un prérendu.
  await connection();
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, name: user.name ?? user.email, email: user.email };
}

/**
 * Barrière d'accès réelle de l'administration, à appeler dans le layout protégé,
 * chaque page sensible, chaque Server Action et chaque Route Handler privé.
 * proxy.ts ne fait qu'une redirection optimiste et ne protège rien à lui seul.
 * Volontairement non mis en cache : une session révoquée doit être refusée aussitôt.
 */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
