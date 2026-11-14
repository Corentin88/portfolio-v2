import { describe, expect, it } from "vitest";
import {
  addScreenshotsSchema,
  createFolderSchema,
  moveMediaSchema,
  renameFolderSchema,
  uploadMediaSchema,
} from "@/features/media/schemas";

describe("schémas de la médiathèque", () => {
  it("accepte un nom de dossier libre et nettoyé", () => {
    expect(
      createFolderSchema.parse({ name: "  Time Manager ", parentId: "" }),
    ).toEqual({ name: "Time Manager", parentId: null });
    expect(
      createFolderSchema.parse({ name: "V2", parentId: "f1" }).parentId,
    ).toBe("f1");
  });

  it("refuse un nom vide, trop long, avec barre oblique ou caractère de contrôle", () => {
    for (const name of [
      "   ",
      "x".repeat(81),
      "Projets/V2",
      "a\\b",
      "a\u0000b",
    ]) {
      expect(renameFolderSchema.safeParse({ id: "f1", name }).success).toBe(
        false,
      );
    }
  });

  it("déplacement : au moins un média, dédoublonné ; vide = « Non classés »", () => {
    expect(
      moveMediaSchema.parse({ mediaIds: "m1,m2,m1", folderId: "" }),
    ).toEqual({ mediaIds: ["m1", "m2"], folderId: null });
    expect(moveMediaSchema.safeParse({ folderId: "f1" }).success).toBe(false);
  });

  it("ajout multiple à une galerie : au moins une image, 100 au plus", () => {
    expect(
      addScreenshotsSchema.parse({ versionId: "v1", mediaIds: "a,b" }).mediaIds,
    ).toEqual(["a", "b"]);
    expect(
      addScreenshotsSchema.safeParse({ versionId: "v1", mediaIds: "" }).success,
    ).toBe(false);
    const tooMany = Array.from({ length: 101 }, (_, i) => `m${i}`).join(",");
    expect(
      addScreenshotsSchema.safeParse({ versionId: "v1", mediaIds: tooMany })
        .success,
    ).toBe(false);
  });

  it("upload : dossier facultatif (absent ou vide = « Non classés »)", () => {
    expect(uploadMediaSchema.parse({ alt: "Logo" }).folderId).toBeNull();
    expect(
      uploadMediaSchema.parse({ alt: "Logo", folderId: "f1" }).folderId,
    ).toBe("f1");
  });
});
