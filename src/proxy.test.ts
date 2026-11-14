import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({ publicProjectExists: vi.fn() }));
vi.mock("@/features/projects/queries", () => queries);

import { proxy } from "@/proxy";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, { headers });
}

function withCookie(cookie: string) {
  return { cookie };
}

function isRedirectToLogin(response: Response) {
  return (
    response.status === 307 &&
    response.headers.get("location") === "http://localhost/admin/login"
  );
}

const passesThrough = (response: Response) =>
  response.headers.get("x-middleware-next") === "1";
const rewrittenTo = (response: Response) =>
  response.headers.get("x-middleware-rewrite");

beforeEach(() => {
  queries.publicProjectExists.mockReset();
});

describe("proxy — administration", () => {
  it("redirige un visiteur sans cookie de session", async () => {
    expect(isRedirectToLogin(await proxy(request("/admin")))).toBe(true);
    expect(isRedirectToLogin(await proxy(request("/admin/projets")))).toBe(
      true,
    );
  });

  it("laisse passer la page de connexion", async () => {
    expect(passesThrough(await proxy(request("/admin/login")))).toBe(true);
  });

  it("laisse passer un cookie de session (vérifié ensuite par requireAdmin)", async () => {
    for (const cookie of [
      "authjs.session-token=x",
      "__Secure-authjs.session-token=x",
      "authjs.session-token.0=x",
    ]) {
      expect(
        passesThrough(await proxy(request("/admin", withCookie(cookie)))),
      ).toBe(true);
    }
  });

  it("ignore un cookie au nom approchant", async () => {
    expect(
      isRedirectToLogin(
        await proxy(
          request("/admin", withCookie("authjs.session-token-fake=x")),
        ),
      ),
    ).toBe(true);
  });
});

describe("proxy — fiches projet", () => {
  it("laisse passer un projet publié", async () => {
    queries.publicProjectExists.mockResolvedValue(true);
    expect(passesThrough(await proxy(request("/projets/mon-projet")))).toBe(
      true,
    );
    expect(queries.publicProjectExists).toHaveBeenCalledWith("mon-projet");
  });

  it("répond un vrai 404 pour un projet inconnu, brouillon ou archivé", async () => {
    queries.publicProjectExists.mockResolvedValue(false);
    expect(rewrittenTo(await proxy(request("/projets/brouillon")))).toBe(
      "http://localhost/_introuvable",
    );
  });

  it("répond 404 pour un slug mal encodé, sans requête", async () => {
    expect(rewrittenTo(await proxy(request("/projets/%E0%A4%A")))).toBe(
      "http://localhost/_introuvable",
    );
    expect(queries.publicProjectExists).not.toHaveBeenCalled();
  });

  it("ne consulte pas la base pour un préchargement", async () => {
    const response = await proxy(
      request("/projets/x", { "next-router-prefetch": "1" }),
    );
    expect(passesThrough(response)).toBe(true);
    expect(queries.publicProjectExists).not.toHaveBeenCalled();
  });

  it("base indisponible : laisse la page décider", async () => {
    queries.publicProjectExists.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(passesThrough(await proxy(request("/projets/x")))).toBe(true);
  });
});
