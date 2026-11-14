import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateAdmin } from "@/features/auth/authenticate";
import { loginInputSchema } from "@/features/auth/schemas";
import { clientKeyFromHeaders } from "@/lib/client-key";
import {
  SESSION_IDLE_MAX_AGE_SECONDS,
  readAdminClaims,
  refreshAdminToken,
} from "@/features/auth/session";

export class LoginRateLimitedError extends CredentialsSignin {
  override code = "rate_limited";
}

// Une ligne par événement, sans pile ni donnée saisie : les échecs de connexion
// et les jetons invalides sont attendus et ne doivent pas noyer les vraies erreurs.
const authLogger = {
  error(error: Error) {
    const type = "type" in error ? String(error.type) : error.name;
    if (type === "CredentialsSignin") {
      const code = "code" in error ? String(error.code) : "credentials";
      console.warn(`[auth] connexion refusée (${code})`);
      return;
    }
    if (type === "JWTSessionError") {
      console.warn("[auth] jeton de session invalide ou expiré");
      return;
    }
    console.error(`[auth] ${type}`);
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  logger: authLogger,
  session: { strategy: "jwt", maxAge: SESSION_IDLE_MAX_AGE_SECONDS },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = loginInputSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const result = await authenticateAdmin(
          parsed.data,
          clientKeyFromHeaders(request.headers),
        );
        if (!result.ok) {
          if (result.reason === "rate_limited")
            throw new LoginRateLimitedError();
          return null;
        }
        const { admin } = result;
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          sessionVersion: admin.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      return refreshAdminToken(token, user);
    },
    session({ session, token }) {
      const claims = readAdminClaims(token);
      if (claims) session.user.id = claims.adminId;
      return session;
    },
  },
});
