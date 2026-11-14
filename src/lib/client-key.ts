/**
 * Clé de limitation d'un client : l'adresse IP vue par le reverse proxy.
 *
 * On retient la DERNIÈRE entrée de X-Forwarded-For, celle qu'écrit le proxy de
 * confiance placé juste devant l'application (Caddy en production). Les entrées
 * précédentes viennent du client et sont falsifiables : prendre la première
 * permettait de contourner la limitation en changeant l'en-tête à chaque requête.
 * Hypothèses (lot 10) : un seul proxy, port de l'application non exposé. Sans
 * en-tête (local), toutes les requêtes partagent la même clé.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const entries = forwarded
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries?.at(-1)?.slice(0, 64) || "local";
}
