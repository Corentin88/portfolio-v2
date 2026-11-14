import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/shared/brand-icons";
import { PolyBackground } from "@/components/shared/poly-background";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactForm } from "@/features/contact/components/contact-form";

type ContactSectionProps = {
  /** Adresse réelle du propriétaire : la section n'est rendue que si elle existe. */
  contactEmail: string;
  availabilityNote: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  /** Durée de conservation lisible, annoncée sous le formulaire. */
  retention: string;
};

export function ContactSection({
  contactEmail,
  availabilityNote,
  linkedinUrl,
  githubUrl,
  retention,
}: ContactSectionProps) {
  const socials = [
    {
      key: "linkedin",
      label: "LinkedIn",
      url: linkedinUrl,
      Icon: LinkedinIcon,
    },
    { key: "github", label: "GitHub", url: githubUrl, Icon: GithubIcon },
  ].filter((social) => social.url);

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative overflow-hidden bg-navy py-24 sm:py-28"
    >
      <PolyBackground className="text-foreground" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-navy-deep/40 via-transparent to-navy-deep/60"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="// contact"
          title="On en parle ?"
          titleId="contact-title"
          description="Un projet, une question, une opportunité — écrivez-moi, je réponds vite et avec plaisir."
        />

        <div className="mx-auto mt-14 grid max-w-5xl gap-10 lg:mt-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14">
          <Reveal delay={100}>
            <div className="flex h-full flex-col gap-4">
              <a
                href={`mailto:${contactEmail}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-foreground/[0.04] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-brand/50 hover:bg-foreground/[0.07] focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-royal text-white transition-colors group-hover:bg-amber-vivid group-hover:text-amber-ink"
                >
                  <Mail className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    E-mail
                  </span>
                  <span className="block font-mono text-[13px] font-medium break-all text-foreground sm:text-sm">
                    {contactEmail}
                  </span>
                </span>
              </a>

              {socials.length > 0 ? (
                <div className="flex gap-4">
                  {socials.map(({ key, label, url, Icon }) => (
                    <a
                      key={key}
                      href={url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} — ouvrir dans un nouvel onglet`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-foreground/[0.04] p-5 font-mono text-sm text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-light hover:bg-foreground/[0.08] focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
                    >
                      <Icon className="size-5" />
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              ) : null}

              {availabilityNote ? (
                <div className="mt-auto rounded-2xl border border-dashed border-border p-5">
                  <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                    <span className="text-amber-brand">tip :</span>{" "}
                    {availabilityNote}
                  </p>
                </div>
              ) : null}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <ContactForm retention={retention} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
