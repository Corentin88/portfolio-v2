"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Maximize2,
  Plus,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/brand-icons";
import { ProjectBadge } from "@/features/projects/components/project-badge";
import { GeneratedCover } from "@/features/projects/components/project-cover";
import { useModalDialog } from "@/components/shared/use-modal-dialog";
import {
  comparePair,
  pickVersion,
  type GalleryImage,
  type PublicProjectDetail,
  type PublicVersion,
} from "@/features/projects/public-view";
import { cn } from "@/lib/utils";

const pillClass =
  "rounded-full px-4 py-1.5 font-mono text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none sm:text-[13px]";

const roundButtonClass =
  "flex size-9 items-center justify-center rounded-full bg-panel-dark/70 text-white backdrop-blur-sm transition-colors hover:bg-panel-dark focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none";

function cycle(index: number, delta: number, length: number): number {
  return (index + delta + length) % length;
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-widest text-amber-brand uppercase">
      {children}
    </p>
  );
}

function versionCaption(version: PublicVersion): string {
  return version.period
    ? `${version.label} · ${version.period}`
    : version.label;
}

function NavButton({
  direction,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        roundButtonClass,
        "absolute top-1/2 z-10 -translate-y-1/2",
        direction === "prev" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

function Shot({
  image,
  priority,
}: {
  image: GalleryImage;
  priority?: boolean;
}) {
  return (
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={image.alt}
      unoptimized
      priority={priority}
      className="absolute inset-0 size-full object-cover object-top"
    />
  );
}

/** Repli sans capture : couverture de version ou du projet, sinon couverture générée. */
function VersionFallback({
  project,
  version,
}: {
  project: PublicProjectDetail;
  version: PublicVersion;
}) {
  if (version.cover) {
    return (
      <Image
        src={version.cover.src}
        width={version.cover.width}
        height={version.cover.height}
        alt={version.cover.alt}
        unoptimized
        className="absolute inset-0 size-full object-cover object-top"
      />
    );
  }
  return (
    <GeneratedCover
      slug={project.slug}
      iconKey={project.iconKey}
      iconImage={project.iconImage}
      monogram={project.monogram}
      label={version.label}
      className="absolute inset-0"
    />
  );
}

function Gallery({
  project,
  version,
  index,
  setIndex,
  onZoom,
}: {
  project: PublicProjectDetail;
  version: PublicVersion;
  index: number;
  setIndex: (index: number) => void;
  onZoom: () => void;
}) {
  const shots = version.screenshots;
  const current = shots[Math.min(index, shots.length - 1)];

  return (
    <figure>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted shadow-lg shadow-royal/10">
        {current ? (
          <>
            <Shot image={current} priority />
            {shots.length > 1 ? (
              <>
                <NavButton
                  direction="prev"
                  label="Capture précédente"
                  onClick={() => setIndex(cycle(index, -1, shots.length))}
                />
                <NavButton
                  direction="next"
                  label="Capture suivante"
                  onClick={() => setIndex(cycle(index, 1, shots.length))}
                />
                <span
                  aria-hidden="true"
                  className="absolute right-3 bottom-3 rounded-full bg-panel-dark/85 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur-sm"
                >
                  {index + 1} / {shots.length}
                </span>
              </>
            ) : null}
            <button
              type="button"
              onClick={onZoom}
              aria-label="Agrandir la capture"
              aria-haspopup="dialog"
              className={cn(roundButtonClass, "absolute top-3 right-3 z-10")}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <VersionFallback project={project} version={version} />
        )}
      </div>

      {shots.length > 1 ? (
        <div
          role="group"
          aria-label={`Miniatures des captures — ${version.label}`}
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
        >
          {shots.map((shot, shotIndex) => (
            <button
              key={shot.src}
              type="button"
              onClick={() => setIndex(shotIndex)}
              aria-label={`Afficher la capture ${shotIndex + 1}`}
              aria-current={shotIndex === index ? "true" : undefined}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none",
                shotIndex === index
                  ? "border-amber-brand"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={shot.thumbnailSrc}
                width={80}
                height={80}
                alt=""
                unoptimized
                loading="lazy"
                className="absolute inset-0 size-full object-cover object-top"
              />
            </button>
          ))}
        </div>
      ) : null}

      <figcaption className="mt-2.5 font-mono text-[11px] text-muted-foreground">
        {current?.caption ? `${current.caption} — ` : null}
        {versionCaption(version)}
      </figcaption>
    </figure>
  );
}

function CompareView({
  from,
  to,
  pairIndex,
  setPairIndex,
}: {
  from: PublicVersion;
  to: PublicVersion;
  pairIndex: number;
  setPairIndex: (index: number) => void;
}) {
  const pairCount = Math.min(from.screenshots.length, to.screenshots.length);

  return (
    <figure>
      <div className="grid gap-4 lg:grid-cols-2">
        {[from, to].map((version) => {
          const shot =
            version.screenshots[
              Math.min(pairIndex, version.screenshots.length - 1)
            ]!;
          return (
            <div key={version.slug}>
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-muted shadow-lg shadow-royal/10">
                <Shot image={shot} />
                <span className="absolute top-3 left-3 rounded-full bg-panel-dark/90 px-3 py-1 font-mono text-[11px] font-bold text-amber-vivid backdrop-blur-sm">
                  {version.label}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {versionCaption(version)}
              </p>
            </div>
          );
        })}
      </div>

      {pairCount > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-3">
          {(["prev", "next"] as const).map((direction) => {
            const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
            return (
              <button
                key={direction}
                type="button"
                onClick={() =>
                  setPairIndex(
                    cycle(pairIndex, direction === "prev" ? -1 : 1, pairCount),
                  )
                }
                aria-label={
                  direction === "prev"
                    ? "Paire de captures précédente"
                    : "Paire de captures suivante"
                }
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border border-border bg-foreground/5 text-foreground transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none",
                  direction === "next" && "order-last",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            );
          })}
          <span
            aria-live="polite"
            className="font-mono text-xs text-muted-foreground"
          >
            Paire {pairIndex + 1} / {pairCount}
          </span>
        </div>
      ) : null}
      <figcaption className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Comparaison entre {from.label} et {to.label}. Sur grand écran, les
        captures s&apos;affichent côte à côte ; sur mobile, l&apos;une sous
        l&apos;autre.
      </figcaption>
    </figure>
  );
}

/** Agrandissement plein écran (dialogue natif : focus piégé, Échap pour fermer). */
function Lightbox({
  project,
  version,
  index,
  setIndex,
  onClose,
}: {
  project: PublicProjectDetail;
  version: PublicVersion;
  index: number;
  setIndex: (index: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const shots = version.screenshots;
  const shot = shots[Math.min(index, shots.length - 1)];

  // Défilement déjà bloqué par la modale projet, ou inutile sur la page dédiée.
  useModalDialog(ref, { lockScroll: false });

  if (!shot) return null;

  return (
    <dialog
      ref={ref}
      aria-label={`Capture agrandie — ${project.title}, ${version.label}`}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      onKeyDown={(event) => {
        if (shots.length < 2) return;
        if (event.key === "ArrowLeft") setIndex(cycle(index, -1, shots.length));
        if (event.key === "ArrowRight") setIndex(cycle(index, 1, shots.length));
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-white/10 bg-panel-dark p-2 text-white backdrop:bg-black/80 sm:p-3"
    >
      <div className="relative">
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl bg-black/40">
          <Image
            src={shot.src}
            width={shot.width}
            height={shot.height}
            alt={shot.alt}
            unoptimized
            className="max-h-[72vh] w-full object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Fermer l'agrandissement"
          className={cn(roundButtonClass, "absolute top-3 right-3")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        {shots.length > 1 ? (
          <>
            <NavButton
              direction="prev"
              label="Capture précédente"
              onClick={() => setIndex(cycle(index, -1, shots.length))}
            />
            <NavButton
              direction="next"
              label="Capture suivante"
              onClick={() => setIndex(cycle(index, 1, shots.length))}
            />
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-panel-dark/85 px-3 py-1 font-mono text-xs text-white backdrop-blur-sm"
            >
              {index + 1} / {shots.length}
            </span>
          </>
        ) : null}
      </div>
      <p className="mt-2 text-center font-mono text-[11px] text-sky-soft-const/80">
        {shot.caption ? `${shot.caption} · ` : null}
        {project.title} · {versionCaption(version)}
        {shots.length > 1 ? " — flèches ← → pour naviguer" : null}
      </p>
    </dialog>
  );
}

function VersionBody({ version }: { version: PublicVersion }) {
  return (
    <>
      <section aria-label="À propos de cette version">
        <Kicker>{"// à propos"}</Kicker>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-sky-soft">
          {version.description
            .split(/\n\s*\n/)
            .filter((paragraph) => paragraph.trim())
            .map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph.trim()}
              </p>
            ))}
        </div>
      </section>

      {version.improvements.length > 0 ? (
        <section
          aria-label="Améliorations de cette version"
          className="rounded-2xl border border-amber-brand/30 bg-amber-brand/[0.07] p-5"
        >
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-amber-brand uppercase">
            <Sparkles className="size-4" aria-hidden="true" />
            Ce qui change dans cette version
          </p>
          <ul className="mt-3.5 space-y-2.5">
            {version.improvements.map((improvement, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground"
              >
                <Plus
                  className="mt-0.5 size-4 shrink-0 text-amber-brand"
                  aria-hidden="true"
                />
                {improvement}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {version.features.length > 0 ? (
        <section aria-label="Fonctionnalités principales">
          <Kicker>{"// fonctionnalités clés"}</Kicker>
          <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
            {version.features.map((feature, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-foreground/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-sky-soft"
              >
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-link"
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {version.challenges.length > 0 ? (
        <section aria-label="Difficultés techniques et solutions">
          <Kicker>{"// difficultés & solutions"}</Kicker>
          <ul className="mt-3.5 space-y-3">
            {version.challenges.map((challenge, index) => (
              <li
                key={index}
                className="rounded-xl border border-border bg-foreground/[0.04] p-4 sm:p-5"
              >
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-amber-brand"
                    aria-hidden="true"
                  />
                  <span className="whitespace-pre-line">
                    <span className="font-semibold text-amber-brand">
                      Difficulté :{" "}
                    </span>
                    {challenge.problem}
                  </span>
                </p>
                <p className="mt-2.5 flex items-start gap-2.5 text-sm leading-relaxed text-sky-soft">
                  <Wrench
                    className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400"
                    aria-hidden="true"
                  />
                  <span className="whitespace-pre-line">
                    <span className="font-semibold text-foreground">
                      Solution :{" "}
                    </span>
                    {challenge.solution}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function VersionFooter({
  project,
  version,
}: {
  project: PublicProjectDetail;
  version: PublicVersion;
}) {
  const hasLinks = Boolean(version.sourceUrl || version.demoUrl);
  if (version.technologies.length === 0 && !hasLinks) return null;

  return (
    <div className="flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      {version.technologies.length > 0 ? (
        <div>
          <Kicker>{"// technologies"}</Kicker>
          <ul
            aria-label={`Technologies de ${project.title} — ${version.label}`}
            className="mt-3 flex flex-wrap gap-1.5"
          >
            {version.technologies.map((technology) => (
              <li
                key={technology}
                className="rounded-full border border-foreground/15 bg-foreground/5 px-2.5 py-0.5 font-mono text-[11px] text-sky-soft/90"
              >
                {technology}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <span />
      )}

      {hasLinks ? (
        <div className="flex flex-wrap gap-3">
          {version.sourceUrl ? (
            <a
              href={version.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-full border border-border bg-foreground/5 px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
            >
              <GithubIcon className="mr-1.5 size-4" />
              Code source
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          ) : null}
          {version.demoUrl ? (
            <a
              href={version.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-full bg-amber-vivid px-4 text-sm font-semibold text-amber-ink transition-colors hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <ExternalLink className="mr-1.5 size-4" aria-hidden="true" />
              Voir la démo
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type ProjectDetailProps = {
  project: PublicProjectDetail;
  /** Version demandée dans l'URL (?version=v2) ; par défaut la plus récente. */
  initialVersion?: string | null;
  titleId: string;
  /** h1 sur la page dédiée, h2 dans la modale (titre de dialogue). */
  titleAs?: "h1" | "h2";
  /** Bouton de fermeture de la modale, placé dans l'en-tête. */
  headerAction?: ReactNode;
  /** En-tête collant (modale défilante). */
  stickyHeader?: boolean;
};

/**
 * Fiche d'un projet (page et modale) : onglets de version, galerie ou
 * comparaison, lightbox, puis contenus de la version choisie.
 */
export function ProjectDetail({
  project,
  initialVersion,
  titleId,
  titleAs: Title = "h1",
  headerAction,
  stickyHeader = false,
}: ProjectDetailProps) {
  const [versionSlug, setVersionSlug] = useState(
    () => pickVersion(project.versions, initialVersion)?.slug,
  );
  const [shotIndex, setShotIndex] = useState(0);
  const [mode, setMode] = useState<"gallery" | "compare">("gallery");
  const [pairIndex, setPairIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const version = pickVersion(project.versions, versionSlug)!;
  const pair = comparePair(project.versions);
  const multiVersion = project.versions.length > 1;

  const switchVersion = (slug: string) => {
    setVersionSlug(slug);
    setShotIndex(0);
    setMode("gallery");
    // Version partageable par l'URL, sans nouvelle entrée d'historique.
    const url = new URL(window.location.href);
    url.searchParams.set("version", slug);
    window.history.replaceState(window.history.state, "", url);
    topRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div ref={topRef}>
      <div
        className={cn(
          "border-b border-border px-5 pt-5 pb-4 sm:px-7",
          stickyHeader &&
            "sticky top-0 z-20 rounded-t-2xl bg-card/95 backdrop-blur-md",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {project.context ? (
              <p className="font-mono text-[11px] tracking-widest text-amber-brand uppercase">
                {project.context}
              </p>
            ) : null}
            <Title
              id={titleId}
              className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {project.title}
            </Title>
            <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              {project.category.name}
            </p>
            {project.badgeLabel ? (
              <ProjectBadge
                label={project.badgeLabel}
                tone={project.badgeTone}
                placement="surface"
                className="mt-2.5"
              />
            ) : null}
          </div>
          {headerAction}
        </div>

        {multiVersion ? (
          <div
            role="group"
            aria-label="Versions du projet"
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <GitBranch
              className="size-4 text-muted-foreground/60"
              aria-hidden="true"
            />
            {project.versions.map((item) => {
              const active = item.slug === version.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => switchVersion(item.slug)}
                  className={cn(
                    pillClass,
                    active
                      ? "bg-amber-vivid text-amber-ink shadow-lg shadow-amber-vivid/25"
                      : "border border-border bg-foreground/5 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        key={version.slug}
        className="version-enter space-y-7 px-5 py-6 sm:px-7"
      >
        <p className="text-base leading-relaxed text-foreground/90">
          {project.summary}
        </p>

        {pair ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Mode d'affichage des captures"
              className="inline-flex items-center rounded-full border border-border bg-foreground/5 p-1"
            >
              <button
                type="button"
                aria-pressed={mode === "gallery"}
                onClick={() => setMode("gallery")}
                className={cn(
                  "rounded-full px-4 py-1.5 font-mono text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none",
                  mode === "gallery"
                    ? "bg-amber-vivid text-amber-ink shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Galerie
              </button>
              <button
                type="button"
                aria-pressed={mode === "compare"}
                onClick={() => {
                  setPairIndex(0);
                  setMode("compare");
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 font-mono text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none",
                  mode === "compare"
                    ? "bg-amber-vivid text-amber-ink shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Comparer {pair.from.label} / {pair.to.label}
              </button>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {mode === "gallery"
                ? `${version.screenshots.length} capture${version.screenshots.length > 1 ? "s" : ""} · ${version.label}`
                : "Captures affichées côte à côte"}
            </p>
          </div>
        ) : null}

        {mode === "compare" && pair ? (
          <CompareView
            from={pair.from}
            to={pair.to}
            pairIndex={pairIndex}
            setPairIndex={setPairIndex}
          />
        ) : (
          <Gallery
            project={project}
            version={version}
            index={shotIndex}
            setIndex={setShotIndex}
            onZoom={() => setZoomed(true)}
          />
        )}

        <VersionBody version={version} />
        <VersionFooter project={project} version={version} />
      </div>

      {zoomed && version.screenshots.length > 0 ? (
        <Lightbox
          project={project}
          version={version}
          index={shotIndex}
          setIndex={setShotIndex}
          onClose={() => setZoomed(false)}
        />
      ) : null}
    </div>
  );
}
