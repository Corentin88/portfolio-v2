import sharp, { type Sharp } from "sharp";

export const MAX_IMAGE_EDGE = 2400;
export const THUMBNAIL_EDGE = 960;
// Garde-fou contre les « bombes de décompression » (petit fichier, image géante).
const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 82;

export type RenderedImage = { data: Buffer; width: number; height: number };

export type ProcessedImage = {
  original: RenderedImage;
  thumbnail: RenderedImage;
};

async function render(pipeline: Sharp, edge: number): Promise<RenderedImage> {
  const { data, info } = await pipeline
    .resize({
      width: edge,
      height: edge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Décode réellement l'image (un fichier corrompu ou déguisé échoue ici), applique
 * l'orientation EXIF puis réencode en WebP. sharp ne recopie aucune métadonnée
 * (EXIF, GPS, XMP) sans demande explicite : elles sont donc supprimées.
 */
export async function processImage(input: Uint8Array): Promise<ProcessedImage> {
  const base = sharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "error",
  }).rotate();

  const [original, thumbnail] = await Promise.all([
    render(base.clone(), MAX_IMAGE_EDGE),
    render(base.clone(), THUMBNAIL_EDGE),
  ]);
  return { original, thumbnail };
}
