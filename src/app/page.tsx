import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { PublicHeader, type NavLink } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ScrollToHash } from "@/components/shared/scroll-to-hash";
import { ContactSection } from "@/features/contact/components/contact-section";
import { formatRetention } from "@/features/contact/retention";
import { ProjectsSection } from "@/features/projects/components/projects-section";
import { getPublicProjectCatalog } from "@/features/projects/queries";
import { HeroSection } from "@/features/site-settings/components/hero-section";
import { PresentationSection } from "@/features/site-settings/components/presentation-section";
import { getPublicSiteSettings } from "@/features/site-settings/queries";
import { SkillsSection } from "@/features/skills/components/skills-section";
import { getPublicSkills } from "@/features/skills/queries";
import { TimelineSection } from "@/features/timeline/components/timeline-section";
import { getPublicTimeline } from "@/features/timeline/queries";
import { getContactRetentionDays } from "@/lib/env";
import { resolveSiteUrl } from "@/lib/site-url";

const NAV_LINKS: NavLink[] = [
  { href: "#presentation", label: "Présentation" },
  { href: "#competences", label: "Compétences" },
  { href: "#projets", label: "Projets" },
  { href: "#parcours", label: "Parcours" },
];

// Titre, description et image de partage réglés dans l'administration (SEO).
// Rendu à la requête, comme le reste de la page : aucune base n'est nécessaire au build.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const settings = await getPublicSiteSettings();
  if (!settings) return {};
  const { title, description, image } = settings.seo;
  const images = image
    ? [
        {
          url: image.src,
          width: image.width,
          height: image.height,
          alt: image.alt,
        },
      ]
    : undefined;
  return {
    metadataBase: (await resolveSiteUrl()) ?? undefined,
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", locale: "fr_FR", images },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  // Rendu à la requête : le build n'a pas besoin de la base. Les lectures restent
  // mises en cache (« use cache ») et seront invalidées par les actions d'administration.
  await connection();
  const [settings, skills, timeline, catalog] = await Promise.all([
    getPublicSiteSettings(),
    getPublicSkills(),
    getPublicTimeline(),
    getPublicProjectCatalog(),
  ]);

  if (!settings) return <ContentNotReady />;

  // Le formulaire n'apparaît qu'avec une adresse réelle : sans destinataire, il
  // ne pourrait rien envoyer.
  const contactHref = settings.contactEmail ? "#contact" : null;

  return (
    <div className="flex min-h-svh flex-col bg-navy-deep">
      <a
        href="#presentation"
        className="sr-only z-[60] rounded-md bg-amber-vivid px-4 py-2 font-medium text-amber-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <PublicHeader links={NAV_LINKS} contactHref={contactHref} />
      <main className="flex-1">
        <HeroSection
          hero={settings.hero}
          contactHref={contactHref}
          cvUrl={settings.cvUrl}
        />
        <PresentationSection
          presentation={settings.presentation}
          statusLabel={settings.hero.statusLabel}
        />
        <SkillsSection skills={skills} />
        <ProjectsSection catalog={catalog} />
        <TimelineSection entries={timeline} />
        {settings.contactEmail ? (
          <ContactSection
            contactEmail={settings.contactEmail}
            availabilityNote={settings.availabilityNote}
            linkedinUrl={settings.linkedinUrl}
            githubUrl={settings.githubUrl}
            retention={formatRetention(getContactRetentionDays())}
          />
        ) : null}
      </main>
      <PublicFooter
        githubUrl={settings.githubUrl}
        linkedinUrl={settings.linkedinUrl}
      />
      <ScrollToHash />
    </div>
  );
}

function HomeFallback() {
  return (
    <div
      aria-busy="true"
      className="flex min-h-svh items-center justify-center bg-royal font-mono text-sm text-sky-soft-const"
    >
      Chargement…
    </div>
  );
}

function ContentNotReady() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-navy-deep p-6 text-center">
      <h1 className="font-display text-2xl font-bold">
        Portfolio en préparation
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Le contenu du site n&apos;a pas encore été initialisé.
      </p>
    </main>
  );
}
