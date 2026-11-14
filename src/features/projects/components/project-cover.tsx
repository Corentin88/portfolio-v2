import Image from "next/image";
import {
  Camera,
  CloudSun,
  CodeXml,
  HandHeart,
  Mountain,
  Rss,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { ProjectIconKey } from "@/features/projects/icons";
import type { PublicImage } from "@/features/media/media-view";
import type { ProjectCardData } from "@/features/projects/public-view";
import { cn } from "@/lib/utils";

// Typé sur la liste partagée : une icône proposée à l'admin sans rendu ne compile pas.
const ICONS: Record<ProjectIconKey, LucideIcon> = {
  code: CodeXml,
  rss: Rss,
  "cloud-sun": CloudSun,
  "hand-heart": HandHeart,
  trophy: Trophy,
  camera: Camera,
  mountain: Mountain,
};

export const PROJECT_ICONS: Readonly<Record<string, LucideIcon>> = ICONS;

/**
 * Icône d'un projet : logo importé (affiché en entier) ou icône du catalogue.
 * Décorative : le titre du projet est toujours affiché à côté.
 */
export function ProjectIconMark({
  iconKey,
  iconImage,
  className,
}: {
  iconKey: string;
  iconImage: PublicImage | null;
  className?: string;
}) {
  if (iconImage) {
    return (
      <Image
        src={iconImage.src}
        width={iconImage.width}
        height={iconImage.height}
        alt=""
        aria-hidden="true"
        unoptimized
        className={cn("object-contain", className)}
      />
    );
  }
  const Icon = PROJECT_ICONS[iconKey] ?? CodeXml;
  return <Icon className={className} aria-hidden="true" />;
}

// Dégradés de la maquette, choisis de façon stable d'après le slug du projet.
const COVER_GRADIENTS = [
  "from-amber-vivid via-[#ff9d4d] to-[#f97316]",
  "from-royal via-royal-light to-[#4f8bff]",
  "from-[#0f766e] via-[#14b8a6] to-[#5eead4]",
  "from-[#7c3aed] via-[#8b5cf6] to-[#c4b5fd]",
  "from-[#be123c] via-[#e11d48] to-[#fb7185]",
  "from-panel-dark via-[#12306b] to-royal",
];

function gradientFor(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length]!;
}

/**
 * Couverture d'une carte : image de couverture du projet si elle existe (affichée
 * seule, sans décor), sinon couverture générée (onglet de fichier + monogramme).
 */
export function ProjectCover({ project }: { project: ProjectCardData }) {
  if (project.coverImage) {
    const { src, width, height, alt } = project.coverImage;
    return (
      <div className="relative aspect-video overflow-hidden bg-panel-dark">
        {/* Fichier déjà réduit à 960 px en WebP à l'upload : pas d'optimiseur Next,
            dont le cache (non invalidable) survivrait à une dépublication. */}
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          unoptimized
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <GeneratedCover
      slug={project.slug}
      iconKey={project.iconKey}
      iconImage={project.iconImage}
      monogram={project.monogram}
      className="relative aspect-video"
    />
  );
}

type GeneratedCoverProps = {
  slug: string;
  iconKey: string;
  iconImage: PublicImage | null;
  monogram: string;
  /** Pastille facultative (libellé de la version dans la fiche projet). */
  label?: string;
  className?: string;
};

/** Couverture de repli : dégradé stable, onglet de fichier, monogramme et icône. */
export function GeneratedCover({
  slug,
  iconKey,
  iconImage,
  monogram,
  label,
  className,
}: GeneratedCoverProps) {
  const Icon = PROJECT_ICONS[iconKey] ?? CodeXml;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden bg-gradient-to-br",
        gradientFor(slug),
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      {iconImage ? (
        <span className="absolute right-5 bottom-5 flex size-16 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-lg sm:size-20">
          <ProjectIconMark
            iconKey={iconKey}
            iconImage={iconImage}
            className="size-full"
          />
        </span>
      ) : (
        <Icon
          className="absolute -right-5 -bottom-6 size-36 text-white/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
          strokeWidth={1.2}
        />
      )}
      <span className="absolute bottom-5 left-5 font-display text-4xl font-bold text-white drop-shadow-md sm:text-5xl">
        {monogram}
      </span>
      <div className="absolute inset-x-0 top-0 flex items-end bg-panel-dark/45 px-3 pt-2 backdrop-blur-sm">
        <span className="inline-flex max-w-full items-center gap-2 truncate rounded-t-md bg-white/10 px-3 py-1 font-mono text-[11px] text-white/80">
          <i className="size-1.5 shrink-0 rounded-full bg-amber-vivid" />
          {slug}.tsx
        </span>
      </div>
      {label ? (
        <span className="absolute top-12 right-4 rounded-full bg-panel-dark/85 px-3 py-1 font-mono text-[11px] text-amber-vivid backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
