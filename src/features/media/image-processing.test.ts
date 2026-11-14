import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage } from "@/features/media/image-processing";

async function jpegWithExif(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#3366ff" },
  })
    .jpeg()
    .withExif({ IFD0: { Make: "Appareil", Copyright: "Auteur" } })
    .toBuffer();
}

describe("processImage", () => {
  it("réencode en WebP, réduit et supprime les métadonnées", async () => {
    const input = await jpegWithExif(3000, 1500);
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const { original, thumbnail } = await processImage(input);
    const meta = await sharp(original.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect([original.width, original.height]).toEqual([2400, 1200]);
    expect([thumbnail.width, thumbnail.height]).toEqual([960, 480]);
  });

  it("n'agrandit pas une petite image", async () => {
    const { original, thumbnail } = await processImage(
      await jpegWithExif(400, 300),
    );
    expect([original.width, original.height]).toEqual([400, 300]);
    expect([thumbnail.width, thumbnail.height]).toEqual([400, 300]);
  });

  it("échoue sur un fichier qui n'est pas réellement une image", async () => {
    const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    await expect(processImage(fake)).rejects.toThrow();
  });
});
