import type { NextRequest } from "next/server";
import { connection } from "next/server";
import {
  contentDisposition,
  fileResponse,
  notFoundResponse,
} from "@/features/media/delivery";
import { getSiteCvForDelivery } from "@/features/media/queries";
import { readMediaFile } from "@/lib/media-storage";

const CV_FILE_NAME = "CV-Corentin-Lanaud.pdf";

/**
 * URL stable du CV : sert le PDF désigné dans l'administration, quel que soit le
 * fichier stocké derrière. ?download=1 force le téléchargement.
 */
export async function GET(request: NextRequest) {
  await connection();
  const cv = await getSiteCvForDelivery();
  if (!cv) return notFoundResponse();

  const data = await readMediaFile(cv.storageKey);
  if (!data) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "media.file_missing",
        key: cv.storageKey,
      }),
    );
    return notFoundResponse();
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  return fileResponse(data, {
    mimeType: "application/pdf",
    // Court : un CV remplacé doit être servi rapidement à la même adresse.
    cacheControl: "public, max-age=300",
    disposition: contentDisposition(
      download ? "attachment" : "inline",
      CV_FILE_NAME,
    ),
  });
}
