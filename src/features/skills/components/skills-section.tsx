import {
  CodeXml,
  Flame,
  LayoutDashboard,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { PolyBackground } from "@/components/shared/poly-background";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import type { PillarIconKey } from "@/features/skills/icons";
import type { PublicSkills } from "@/features/skills/public-view";

// Typé sur la liste partagée : ajouter une icône sans son rendu ne compile pas.
const PILLAR_ICONS: Record<PillarIconKey, LucideIcon> = {
  code: CodeXml,
  radar: Radar,
  "layout-dashboard": LayoutDashboard,
  flame: Flame,
};

export function SkillsSection({ skills }: { skills: PublicSkills }) {
  const isEmpty = skills.pillars.length === 0 && skills.groups.length === 0;

  return (
    <section
      id="competences"
      aria-labelledby="competences-title"
      className="relative overflow-hidden bg-royal py-24 sm:py-28"
    >
      <PolyBackground className="text-white" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="// compétences"
          title="L'essence de mon travail"
          titleId="competences-title"
          description="Ce que je mets dans la balance au quotidien — des technos solides, une curiosité de veille et une obsession : des interfaces qui ont du sens."
          tone="royal"
        />

        {isEmpty ? (
          <p className="mt-14 text-center font-mono text-sm text-sky-soft-const/70">
            Compétences bientôt disponibles.
          </p>
        ) : null}

        {skills.pillars.length > 0 ? (
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {skills.pillars.map((pillar, index) => {
              const Icon =
                PILLAR_ICONS[pillar.iconKey as PillarIconKey] ?? CodeXml;
              return (
                <li key={pillar.id}>
                  <Reveal delay={index * 110} className="h-full">
                    <article className="group h-full rounded-2xl border border-white/15 bg-black/20 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-vivid/50 hover:bg-black/30 hover:shadow-xl hover:shadow-black/40">
                      <div
                        aria-hidden="true"
                        className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition-colors duration-300 group-hover:border-amber-vivid/50 group-hover:bg-amber-vivid group-hover:text-amber-ink"
                      >
                        <Icon className="size-6" />
                      </div>
                      <h3 className="mt-5 font-display text-lg font-semibold text-white">
                        {pillar.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-sky-soft-const/85">
                        {pillar.description}
                      </p>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        ) : null}

        {skills.groups.length > 0 ? (
          <Reveal delay={150} className="mt-12 lg:mt-14">
            <p className="text-center font-mono text-xs tracking-[0.3em] text-sky-soft-const/60 uppercase">
              Stack &amp; outils
            </p>
            <div className="mx-auto mt-6 grid max-w-4xl gap-6 sm:grid-cols-2">
              {skills.groups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-center font-mono text-[13px] font-medium text-amber-vivid sm:text-left">
                    {group.name}
                  </h3>
                  <ul
                    aria-label={`Technologies : ${group.name}`}
                    className="mt-3 flex flex-wrap justify-center gap-2.5 sm:justify-start"
                  >
                    {group.technologies.map((technology) => (
                      <li
                        key={technology.id}
                        className="rounded-full border border-white/20 bg-black/25 px-4 py-1.5 font-mono text-[13px] text-sky-soft-const transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-vivid hover:text-amber-vivid"
                      >
                        {technology.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
