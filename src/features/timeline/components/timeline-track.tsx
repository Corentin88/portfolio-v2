"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CodeXml,
  Compass,
  GraduationCap,
  Rocket,
  Sprout,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import type { TimelineIconKey } from "@/features/timeline/icons";
import type { PublicTimelineEntry } from "@/features/timeline/public-view";
import { cn } from "@/lib/utils";

// Typé sur la liste partagée : ajouter une icône sans son rendu ne compile pas.
const ENTRY_ICONS: Record<
  Exclude<TimelineIconKey, "alt">,
  { icon: LucideIcon; className: string }
> = {
  users: { icon: UsersRound, className: "bg-emerald-600 text-white" },
  rocket: { icon: Rocket, className: "bg-royal text-white" },
  graduation: { icon: GraduationCap, className: "bg-slate-700 text-white" },
  compass: { icon: Compass, className: "bg-amber-vivid text-amber-ink" },
  sprout: { icon: Sprout, className: "bg-lime-600 text-white" },
  code: { icon: CodeXml, className: "bg-royal-light text-white" },
};

// Taille commune à l'illustration et à l'icône de repli : plus présente qu'un simple
// pictogramme, réduite sur mobile pour laisser la place au texte.
const BADGE_SIZE = "size-16 rounded-2xl sm:size-20";

function EntryBadge({ entry }: { entry: PublicTimelineEntry }) {
  if (entry.image) {
    const { src, width, height, alt } = entry.image;
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1.5 shadow-md",
          BADGE_SIZE,
        )}
      >
        {/* object-contain : un logo n'est jamais rogné, quel que soit son ratio. */}
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          unoptimized
          sizes="80px"
          className="size-full object-contain"
        />
      </span>
    );
  }
  // « alt » : badge texte de l'école Alt, comme dans la maquette.
  if (entry.iconKey === "alt") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center bg-panel-dark font-mono text-sm font-bold text-white shadow-md sm:text-base",
          BADGE_SIZE,
        )}
      >
        {"<Alt/>"}
      </span>
    );
  }
  const { icon: Icon, className } =
    ENTRY_ICONS[entry.iconKey as Exclude<TimelineIconKey, "alt">] ??
    ENTRY_ICONS.code;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center shadow-md",
        BADGE_SIZE,
        className,
      )}
    >
      <Icon className="size-7 sm:size-8" />
    </span>
  );
}

/** Liste chronologique dont la ligne centrale se remplit au fil du défilement. */
export function TimelineTrack({ entries }: { entries: PublicTimelineEntry[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const element = containerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const anchor = window.innerHeight * 0.7;
      const passed = Math.min(Math.max(anchor - rect.top, 0), rect.height);
      setProgress(rect.height > 0 ? passed / rect.height : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative mt-14 lg:mt-20">
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-5 w-0.5 rounded-full bg-white/20 lg:left-1/2 lg:-translate-x-1/2"
      />
      <div
        aria-hidden="true"
        className="absolute top-0 left-5 w-0.5 rounded-full bg-amber-vivid shadow-[0_0_12px_rgba(255,178,36,0.5)] lg:left-1/2 lg:-translate-x-1/2"
        style={{ height: `${progress * 100}%` }}
      />

      <ol className="space-y-10 lg:space-y-14">
        {entries.map((entry, index) => {
          const isLeft = index % 2 === 0;
          return (
            <li
              key={entry.id}
              className="relative pl-14 lg:grid lg:grid-cols-[1fr_7rem_1fr] lg:pl-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1.5 left-5 z-10 size-4 -translate-x-1/2 rounded-full border-[3px] border-amber-vivid bg-royal transition-colors duration-500 lg:top-12 lg:left-1/2",
                  progress * entries.length > index && "bg-amber-vivid",
                )}
              />

              <div className="hidden lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:items-center">
                <Reveal>
                  <span className="rounded-full border border-black/30 bg-panel-dark/90 px-3 py-1 font-mono text-sm font-bold text-amber-vivid shadow-md">
                    {entry.periodLabel}
                  </span>
                </Reveal>
              </div>

              <Reveal
                delay={80}
                className={cn(
                  "lg:row-start-1",
                  isLeft
                    ? "lg:col-start-1 lg:pr-14"
                    : "lg:col-start-3 lg:pl-14",
                )}
              >
                <span className="mb-3 inline-block rounded-full border border-black/30 bg-panel-dark/90 px-3 py-1 font-mono text-xs font-bold text-amber-vivid shadow-md lg:hidden">
                  {entry.periodLabel}
                </span>
                <article className="rounded-2xl border border-white/60 bg-white p-5 shadow-xl shadow-royal/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-royal/35 sm:p-6">
                  <div className="flex items-start gap-4 sm:gap-5">
                    <EntryBadge entry={entry} />
                    <div className="min-w-0">
                      <h3 className="font-display text-base leading-snug font-semibold text-panel-dark sm:text-lg">
                        <span className="sr-only">{entry.periodLabel} — </span>
                        {entry.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
