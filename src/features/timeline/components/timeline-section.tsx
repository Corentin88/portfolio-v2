import { PolyBackground } from "@/components/shared/poly-background";
import { SectionHeading } from "@/components/shared/section-heading";
import { TimelineTrack } from "@/features/timeline/components/timeline-track";
import type { PublicTimelineEntry } from "@/features/timeline/public-view";

export function TimelineSection({
  entries,
}: {
  entries: PublicTimelineEntry[];
}) {
  return (
    <section
      id="parcours"
      aria-labelledby="parcours-title"
      className="relative overflow-hidden bg-royal py-24 sm:py-28"
    >
      <PolyBackground className="text-white" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          kicker="// parcours"
          title="Timeline"
          titleId="parcours-title"
          description="De l'agroalimentaire au développement web — une reconversion assumée, bit par bit."
          tone="royal"
        />

        {entries.length === 0 ? (
          <p className="mt-14 text-center font-mono text-sm text-sky-soft-const/70">
            Aucune étape pour le moment.
          </p>
        ) : (
          <TimelineTrack entries={entries} />
        )}
      </div>
    </section>
  );
}
