import { cn } from "@/lib/utils";
import { Reveal } from "@/components/shared/reveal";

type SectionHeadingProps = {
  /** Libellé monospace façon code, ex. « // projets ». */
  kicker: string;
  title: string;
  /** Identifiant du titre, référencé par aria-labelledby de la section. */
  titleId: string;
  description?: string;
  /** « royal » : fond bleu roi constant ; « surface » : fond qui suit le thème. */
  tone?: "royal" | "surface";
};

export function SectionHeading({
  kicker,
  title,
  titleId,
  description,
  tone = "surface",
}: SectionHeadingProps) {
  const isRoyal = tone === "royal";

  return (
    <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <span
        className={cn(
          "font-mono text-sm tracking-widest uppercase",
          isRoyal ? "text-amber-vivid" : "text-amber-brand",
        )}
      >
        {kicker}
      </span>
      <h2
        id={titleId}
        className={cn(
          "mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl",
          isRoyal ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <span
        aria-hidden="true"
        className={cn(
          "shimmer-line mt-5 h-1 w-20 rounded-full",
          isRoyal ? "bg-amber-vivid" : "bg-amber-brand",
        )}
      />
      {description ? (
        <p
          className={cn(
            "mt-5 max-w-2xl text-base leading-relaxed sm:text-lg",
            isRoyal ? "text-sky-soft-const" : "text-sky-soft",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
