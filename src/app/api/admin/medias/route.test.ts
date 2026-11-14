import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const queries = vi.hoisted(() => ({
  listMediaFolders: vi.fn(),
  searchAdminMedia: vi.fn(),
  countUnclassifiedMedia: vi.fn(),
}));
const getCurrentAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/features/media/queries", () => queries);
vi.mock("@/features/auth/require-admin", () => ({ getCurrentAdmin }));

import { GET } from "@/app/api/admin/medias/route";

const request = (query: string) =>
  new NextRequest(`http://localhost/api/admin/medias?${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentAdmin.mockResolvedValue({
    id: "a1",
    name: "Admin",
    email: "a@b.c",
  });
  queries.listMediaFolders.mockResolvedValue([
    {
      id: "f1",
      name: "Projets",
      parentId: null,
      _count: { media: 3, children: 0 },
    },
  ]);
  queries.searchAdminMedia.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageCount: 1,
  });
  queries.countUnclassifiedMedia.mockResolvedValue(7);
});

describe("GET /api/admin/medias", () => {
  it("refuse un visiteur non connecté sans rien lire", async () => {
    getCurrentAdmin.mockResolvedValue(null);
    const response = await GET(request(""));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(queries.searchAdminMedia).not.toHaveBeenCalled();
  });

  it("impose le type du contexte, quel que soit le paramètre reçu", async () => {
    await GET(request("accept=IMAGE&type=pdf&q=logo&page=2"));
    const [query] = queries.searchAdminMedia.mock.calls[0]!;
    expect(query).toMatchObject({ type: "images", q: "logo", page: 2 });
    await GET(request("accept=DOCUMENT&type=images"));
    expect(queries.searchAdminMedia.mock.calls[1]![0].type).toBe("pdf");
  });

  it("renvoie les dossiers et le compte des non classés, sans cache", async () => {
    const response = await GET(request("dossier=f1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageCount: 1,
      folders: [{ id: "f1", name: "Projets", parentId: null, mediaCount: 3 }],
      unclassifiedCount: 7,
    });
  });
});
