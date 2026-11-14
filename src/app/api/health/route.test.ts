import { beforeEach, describe, expect, it, vi } from "vitest";

const pingDatabase = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/db", () => ({ pingDatabase }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("répond 200 sans cache quand la base répond", async () => {
    pingDatabase.mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("répond 503 sans détail technique quand la base est injoignable", async () => {
    pingDatabase.mockResolvedValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error" });
  });
});
