import { ArrowDown, ArrowUpRight, FileDown } from "lucide-react";
import { PolyBackground } from "@/components/shared/poly-background";
import { Reveal } from "@/components/shared/reveal";
import type { PublicSiteSettings } from "@/features/site-settings/public-view";

type HeroSectionProps = {
  hero: PublicSiteSettings["hero"];
  contactHref: string | null;
  cvUrl: string | null;
};

export function HeroSection({ hero, contactHref, cvUrl }: HeroSectionProps) {
  return (
    <section
      id="hero"
      aria-label="Introduction"
      className="relative flex min-h-svh flex-col overflow-hidden bg-royal"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-royal-light/60 via-transparent to-navy-deep/40"
      />
      <PolyBackground className="text-white" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pt-28 pb-20 text-center sm:px-6">
        <Reveal>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-mono text-xs tracking-wide text-white backdrop-blur-sm sm:text-[13px]">
            <span
              aria-hidden="true"
              className="pulse-dot inline-block size-2 rounded-full bg-green-400"
            />
            {hero.statusLabel}
          </span>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-10 inline-block rounded-xl border border-black/20 bg-panel-dark/80 px-5 py-3 font-mono text-sm text-white shadow-xl shadow-black/30 sm:px-7 sm:py-4 sm:text-lg">
            <span className="text-amber-vivid" aria-hidden="true">
              $
            </span>{" "}
            {hero.tagline}
          </p>
        </Reveal>

        <Reveal delay={220}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-sky-soft-const sm:text-lg">
            {hero.taglineSub}
          </p>
        </Reveal>

        <Reveal delay={320}>
          <h1 className="mt-8 font-display text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl">
            On en parle&nbsp;?
          </h1>
          <p className="mt-4 font-mono text-sm tracking-wide text-sky-soft-const/90 sm:text-base">
            {hero.roleLine}
          </p>
        </Reveal>

        <Reveal delay={420}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#projets"
              className="inline-flex h-12 items-center rounded-full bg-amber-vivid px-7 text-base font-semibold text-amber-ink shadow-lg shadow-amber-vivid/25 transition-all hover:-translate-y-0.5 hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Découvrir mes projets
              <ArrowUpRight className="ml-1.5 size-5" aria-hidden="true" />
            </a>
            {contactHref ? (
              <a
                href={contactHref}
                className="inline-flex h-12 items-center rounded-full border border-white/40 bg-white/5 px-7 text-base font-medium text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Me contacter
              </a>
            ) : null}
            {cvUrl ? (
              <a
                href={`${cvUrl}?download=1`}
                className="inline-flex h-12 items-center rounded-full border border-white/40 bg-white/5 px-7 text-base font-medium text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <FileDown className="mr-1.5 size-5" aria-hidden="true" />
                Télécharger mon CV
                <span className="sr-only"> (PDF)</span>
              </a>
            ) : null}
          </div>
        </Reveal>
      </div>

      <a
        href="#presentation"
        className="relative mx-auto mb-8 flex flex-col items-center gap-2 text-sky-soft-const transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase opacity-70">
          Défiler
        </span>
        {/* Nom accessible = texte visible complété (WCAG 2.5.3, label dans le nom). */}
        <span className="sr-only">vers la présentation</span>
        <ArrowDown className="animate-soft-bounce size-5" aria-hidden="true" />
      </a>
    </section>
  );
}
