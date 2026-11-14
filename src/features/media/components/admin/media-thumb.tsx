import Image from "next/image";
import { FileText } from "lucide-react";
import { toPublicImage, type ImageMedia } from "@/features/media/media-view";
import { cn } from "@/lib/utils";

/**
 * Aperçu d'administration. Image servie telle quelle (unoptimized) : l'optimiseur de
 * Next ne transmet pas les cookies et ne pourrait pas lire un média encore privé.
 */
export function MediaThumb({
  media,
  shape = "video",
  fit = "cover",
  className,
}: {
  media: ImageMedia | null;
  /** square : petit aperçu carré (photo, logo). */
  shape?: "video" | "square";
  /** contain : logo affiché en entier, comme sur le site. */
  fit?: "cover" | "contain";
  className?: string;
}) {
  const image = media ? toPublicImage(media, { variant: "thumbnail" }) : null;
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg border border-border",
        shape === "video" ? "aspect-video w-full" : "aspect-square",
        // Fond blanc seulement sous un logo : le texte « Aucune image » garde
        // le contraste du thème (bg-muted).
        fit === "contain" && image ? "bg-white p-1" : "bg-muted",
        className,
      )}
    >
      {image ? (
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          unoptimized
          className={cn(
            "size-full",
            fit === "contain" ? "object-contain" : "object-cover",
          )}
        />
      ) : media ? (
        <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
      ) : (
        <span className="text-xs text-muted-foreground">Aucune image</span>
      )}
    </div>
  );
}
