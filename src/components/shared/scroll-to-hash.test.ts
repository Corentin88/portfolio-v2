import { describe, expect, it } from "vitest";
import { hashTargetId } from "@/components/shared/scroll-to-hash";

describe("hashTargetId", () => {
  it("extrait l'identifiant des ancres des sections", () => {
    expect(hashTargetId("#projets")).toBe("projets");
    expect(hashTargetId("#competences")).toBe("competences");
  });

  it("ignore l'absence d'ancre", () => {
    expect(hashTargetId("")).toBeNull();
    expect(hashTargetId("#")).toBeNull();
  });

  it("refuse les ancres qui ne peuvent pas désigner une section", () => {
    expect(hashTargetId("#%E0%A4%A")).toBeNull(); // encodage invalide
    expect(hashTargetId("#1abc")).toBeNull();
    expect(hashTargetId("#a b")).toBeNull();
    expect(hashTargetId(`#${"a".repeat(80)}`)).toBeNull();
    expect(hashTargetId("projets")).toBeNull();
  });
});
