import { describe, expect, it } from "vitest";
import {
  checkUploadedFile,
  detectFormat,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  sanitizeOriginalName,
} from "@/features/media/file-validation";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const WEBP = text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const PDF = text("%PDF-1.7\n");
// Boîte ftyp de 24 octets : marque principale « mif1 », compatibles mif1 et avif.
const AVIF = new Uint8Array([
  0,
  0,
  0,
  24,
  ...text("ftyp"),
  ...text("mif1"),
  0,
  0,
  0,
  0,
  ...text("mif1"),
  ...text("avif"),
]);

function padded(head: Uint8Array, size: number): Uint8Array {
  const data = new Uint8Array(size);
  data.set(head);
  return data;
}

describe("detectFormat", () => {
  it("reconnaît les formats acceptés par leur signature", () => {
    expect(detectFormat(JPEG)).toBe("jpeg");
    expect(detectFormat(PNG)).toBe("png");
    expect(detectFormat(WEBP)).toBe("webp");
    expect(detectFormat(AVIF)).toBe("avif");
    expect(detectFormat(PDF)).toBe("pdf");
  });

  it("ne reconnaît ni SVG, ni HTML, ni GIF, ni HEIC", () => {
    expect(detectFormat(text("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBe(
      null,
    );
    expect(detectFormat(text("<!doctype html><script>"))).toBeNull();
    expect(detectFormat(text("GIF89a"))).toBeNull();
    const heic = new Uint8Array([
      0,
      0,
      0,
      16,
      ...text("ftyp"),
      ...text("heic"),
      0,
      0,
      0,
      0,
    ]);
    expect(detectFormat(heic)).toBeNull();
  });
});

describe("checkUploadedFile", () => {
  it("accepte une image et un PDF valides", () => {
    expect(checkUploadedFile({ name: "photo.JPG", bytes: JPEG })).toEqual({
      ok: true,
      format: "jpeg",
      kind: "IMAGE",
    });
    expect(checkUploadedFile({ name: "cv.pdf", bytes: PDF })).toMatchObject({
      ok: true,
      kind: "DOCUMENT",
    });
  });

  it("refuse le SVG et les extensions inconnues, même avec un contenu d'image", () => {
    expect(checkUploadedFile({ name: "logo.svg", bytes: PNG })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/SVG refusé/),
    });
    expect(checkUploadedFile({ name: "image.php", bytes: JPEG }).ok).toBe(
      false,
    );
    expect(checkUploadedFile({ name: "sans-extension", bytes: JPEG }).ok).toBe(
      false,
    );
  });

  it("refuse un contenu qui ne correspond pas à l'extension", () => {
    expect(
      checkUploadedFile({ name: "faux.png", bytes: text("<html>") }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/contenu/) });
    expect(checkUploadedFile({ name: "image.jpg", bytes: PDF })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/extension/),
    });
    expect(checkUploadedFile({ name: "cv.pdf", bytes: PNG }).ok).toBe(false);
  });

  it("refuse un fichier vide", () => {
    expect(
      checkUploadedFile({ name: "a.png", bytes: new Uint8Array() }).ok,
    ).toBe(false);
  });

  it("applique les tailles maximales par type", () => {
    const check = (name: string, head: Uint8Array, size: number) =>
      checkUploadedFile({ name, bytes: padded(head, size) });

    expect(check("a.png", PNG, MAX_IMAGE_BYTES).ok).toBe(true);
    expect(check("a.png", PNG, MAX_IMAGE_BYTES + 1)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/8 Mo/),
    });
    expect(check("a.pdf", PDF, MAX_IMAGE_BYTES + 1).ok).toBe(true);
    expect(check("a.pdf", PDF, MAX_DOCUMENT_BYTES + 1)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/10 Mo/),
    });
  });
});

describe("sanitizeOriginalName", () => {
  it("retire dossiers et caractères de contrôle", () => {
    expect(sanitizeOriginalName("..\\..\\secret/évasion\u0000.png")).toBe(
      "évasion.png",
    );
    expect(sanitizeOriginalName("   ")).toBe("fichier");
    expect(sanitizeOriginalName("a".repeat(300))).toHaveLength(255);
  });
});
