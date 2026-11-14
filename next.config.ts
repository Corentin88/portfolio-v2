import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP sans nonce (doc Next « Without Nonces ») : un nonce imposerait un rendu
// entièrement dynamique, incompatible avec le shell prérendu de cacheComponents.
// 'unsafe-inline' reste nécessaire aux scripts d'hydratation et à next-themes ;
// tout le reste (fonts next/font, médias /media) est servi par le site lui-même.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Ignoré par les navigateurs en HTTP : sans effet en local, actif derrière HTTPS.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  // Sortie autonome (server.js + dépendances tracées) réservée à l'image Docker :
  // `next start` (développement, E2E, CI) garde la sortie classique.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Valeurs par défaut du gabarit Next.js 16.4 : rendu partiel et directive "use cache".
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Upload de médias par Server Action : PDF de 10 Mo + surcoût multipart.
    // La limite par format est appliquée ensuite par le service (8 Mo image / 10 Mo PDF).
    serverActions: { bodySizeLimit: "11mb" },
    // proxy.ts couvre /admin : le corps doit pouvoir y être lu en entier.
    proxyClientMaxBodySize: "11mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
