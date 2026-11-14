import { NextResponse, type NextRequest } from "next/server";
import { publicProjectExists } from "@/features/projects/queries";

const LOGIN_PATH = "/admin/login";
// Cookie de session Auth.js, éventuellement préfixé (HTTPS) ou découpé en morceaux (.0, .1…).
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;
const PROJECT_PATH = /^\/projets\/([^/]+)\/?$/;
// Chemin sans route : Next y rend app/not-found.tsx avec un statut 404.
const NOT_FOUND_PATH = "/_introuvable";

export async function proxy(request: NextRequest) {
  const project = PROJECT_PATH.exec(request.nextUrl.pathname);
  if (project?.[1]) return guardProjectPage(request, project[1]);
  return guardAdmin(request);
}

/**
 * Redirection optimiste : évite d'afficher l'administration sans cookie de
 * session. Ce n'est pas une protection — le cookie n'est pas vérifié ici ;
 * la vérification réelle est faite par requireAdmin() côté serveur.
 */
function guardAdmin(request: NextRequest) {
  if (request.nextUrl.pathname === LOGIN_PATH) return NextResponse.next();

  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => SESSION_COOKIE.test(name));
  if (hasSessionCookie) return NextResponse.next();

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

/**
 * Projet inconnu, brouillon ou archivé → vrai 404. La page, streamée sous
 * Suspense, ne peut plus changer son statut 200 quand notFound() survient.
 * Les préchargements du catalogue (liens vers des projets publiés) ne coûtent
 * pas de requête ; base indisponible → la page décide (cache ou page d'erreur).
 */
async function guardProjectPage(request: NextRequest, rawSlug: string) {
  if (request.headers.get("next-router-prefetch")) return NextResponse.next();
  let exists: boolean;
  try {
    exists = await publicProjectExists(decodeURIComponent(rawSlug));
  } catch (error) {
    if (error instanceof URIError) exists = false;
    else return NextResponse.next();
  }
  return exists
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/projets/:slug"],
};
