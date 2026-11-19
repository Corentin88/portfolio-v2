import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { BusinessCard } from "@/features/site-settings/components/business-card";
import { CvLink } from "@/features/site-settings/components/cv-link";
import type { PublicSiteSettings } from "@/features/site-settings/public-view";

const OWNER_FIRST_NAME = "Corentin";

/** Met le prénom en gras s'il apparaît dans le paragraphe (texte éditable). */
function WithName({ text }: { text: string }) {
  const index = text.indexOf(OWNER_FIRST_NAME);
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <strong className="font-semibold text-foreground">
        {OWNER_FIRST_NAME}
      </strong>
      {text.slice(index + OWNER_FIRST_NAME.length)}
    </>
  );
}

export function PresentationSection({
  presentation,
  statusLabel,
  cvUrl,
}: {
  presentation: PublicSiteSettings["presentation"];
  statusLabel: string;
  cvUrl: string | null;
}) {
  const [first, ...rest] = presentation.paragraphs;

  return (
    <section
      id="presentation"
      aria-labelledby="presentation-title"
      className="relative overflow-hidden bg-navy py-24 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-12 -right-24 hidden font-mono text-[220px] leading-none font-bold text-foreground/[0.04] select-none lg:block"
      >
        {"</>"}
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="// présentation"
          title={presentation.title}
          titleId="presentation-title"
        />

        <div className="mt-14 grid items-center gap-12 lg:mt-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <Reveal className="mx-auto w-full max-w-sm lg:mx-0">
            <BusinessCard
              photo={presentation.photo}
              statusLabel={statusLabel}
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-5 text-left text-base leading-relaxed text-sky-soft sm:text-lg">
              {first ? (
                <p>
                  <WithName text={first} />
                </p>
              ) : null}
              {rest.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {presentation.quote ? (
                <p className="border-l-2 border-amber-brand pl-4 font-medium text-foreground">
                  {presentation.quote}
                </p>
              ) : null}
            </div>
            {cvUrl ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <CvLink cvUrl={cvUrl} action="download" />
                <CvLink cvUrl={cvUrl} action="preview" />
              </div>
            ) : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
