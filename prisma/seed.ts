import "dotenv/config";
import { db } from "@/lib/db";

// Seed idempotent : il initialise une base vide et ne modifie jamais un contenu
// existant (upsert sans mise à jour, ou insertion seulement si la table est vide),
// afin de ne pas écraser ce qui a été édité depuis l'administration.
// Aucun compte administrateur ici : il est créé par un script dédié.

const SITE_SETTINGS = {
  heroStatusLabel: "Disponible pour de nouvelles opportunités",
  heroRoleLine: "Développeur full-stack — du front au back, avec soin",
  heroTagline: "À la recherche d'un développeur ?",
  heroTaglineSub:
    "Bonne nouvelle, vous venez peut-être de le trouver. Développeur sympa, à l'écoute, toujours partant pour transformer une idée en vrai projet !",
  presentationTitle: "Découvrez qui je suis !",
  presentationBody: [
    "Bonjour, je m'appelle Corentin, développeur web en reconversion, passionné par l'univers du code et des technologies.",
    "J'ai choisi de me réorienter vers un domaine qui me stimule vraiment : créer, comprendre et résoudre des problèmes concrets grâce au développement.",
    "Encore en début de parcours, je construis des projets avec sérieux, curiosité et l'envie constante de progresser.",
  ].join("\n\n"),
  presentationQuote:
    "Chaque ligne de code est une occasion d'apprendre, chaque bug une opportunité de grandir.",
  // Valeur provisoire, à remplacer depuis l'administration.
  contactEmail: "contact@example.com",
  availabilityNote: "Réponse sous 24 h, souvent bien plus vite.",
  githubUrl: "https://github.com/Corentin88",
  seoTitle: "Corentin Lanaud — Développeur full-stack",
  seoDescription:
    "Portfolio de Corentin Lanaud, développeur full-stack : projets, compétences et parcours.",
};

const PROJECT_CATEGORIES = [
  { name: "Web app", slug: "web-app" },
  { name: "Site web", slug: "site-web" },
  { name: "Site vitrine", slug: "site-vitrine" },
  { name: "Bot & automatisation", slug: "bot-automatisation" },
];

const SKILL_CATEGORIES = [
  { name: "Front-end", slug: "front-end" },
  { name: "Back-end", slug: "back-end" },
  { name: "Bases de données", slug: "bases-de-donnees" },
  { name: "Outils & DevOps", slug: "outils-devops" },
];

const TECHNOLOGIES = [
  { name: "React", slug: "react", category: "front-end" },
  { name: "Next.js", slug: "nextjs", category: "front-end" },
  { name: "TypeScript", slug: "typescript", category: "front-end" },
  { name: "Tailwind CSS", slug: "tailwind-css", category: "front-end" },
  { name: "Symfony", slug: "symfony", category: "back-end" },
  { name: "PHP", slug: "php", category: "back-end" },
  { name: "API Platform", slug: "api-platform", category: "back-end" },
  { name: "MySQL", slug: "mysql", category: "bases-de-donnees" },
  { name: "PostgreSQL", slug: "postgresql", category: "bases-de-donnees" },
  { name: "Docker", slug: "docker", category: "outils-devops" },
  { name: "n8n", slug: "n8n", category: "outils-devops" },
  { name: "Git & GitHub", slug: "git-github", category: "outils-devops" },
];

const SKILL_PILLARS = [
  {
    title: "Expérience techno",
    description: "Utilisation de Symfony, Next.js, n8n, Docker, API Platform…",
    iconKey: "code",
  },
  {
    title: "Veille technologique",
    description: "Suivi constant des tendances, actualités et vulnérabilités.",
    iconKey: "radar",
  },
  {
    title: "Ergonomie qui fait sens",
    description: "Conception d'interfaces claires et accessibles.",
    iconKey: "layout-dashboard",
  },
  {
    title: "Passion & innovation",
    description: "Projets persos, apprentissage continu.",
    iconKey: "flame",
  },
];

// De la plus récente à la plus ancienne, ordre d'affichage de la maquette.
const TIMELINE_ENTRIES = [
  {
    periodLabel: "2026",
    title: "Titre professionnel Concepteur Développeur d'Applications",
    description:
      "Obtention du titre professionnel CDA — RNCP niveau 6 (Bac +3). Formation réalisée au sein d'Alt.",
    iconKey: "alt",
  },
  {
    periodLabel: "2026",
    title: "Projet Bénévolink — Application web full-stack (7 mois)",
    description:
      "Projet réalisé en équipe pendant la formation CDA. Développement d'une plateforme de mise en relation entre associations et bénévoles, de la conception à la réalisation.",
    iconKey: "users",
  },
  {
    periodLabel: "2025",
    title: "Formation Concepteur Développeur d'Applications — Alt",
    description:
      "Formation intensive au métier de CDA au sein d'Alt, incubateur par l'immersion. Parcours orienté pratique : apprentissage par projets, travail en équipe et mise en situation professionnelle.",
    iconKey: "alt",
  },
  {
    periodLabel: "2025",
    title: "Titre professionnel Développeur Web / Web Mobile",
    description:
      "Obtention du titre professionnel DWWM — RNCP niveau 5. Une première pierre solide dans la reconversion.",
    iconKey: "rocket",
  },
  {
    periodLabel: "2024",
    title: "Baccalauréat (candidat libre)",
    description:
      "Obtention du niveau Bac pour pouvoir accéder à une formation.",
    iconKey: "graduation",
  },
  {
    periodLabel: "2024",
    title: "Début de la reconversion",
    description:
      "Un nouveau cap vers le développement web, entre passion et ambition.",
    iconKey: "compass",
  },
  {
    periodLabel: "2023",
    title: "Agent polyvalent",
    description: "Travail en équipe dans le secteur agroalimentaire.",
    iconKey: "sprout",
  },
];

async function main(): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...SITE_SETTINGS },
      update: {},
    });

    for (const [position, category] of PROJECT_CATEGORIES.entries()) {
      await tx.projectCategory.upsert({
        where: { slug: category.slug },
        create: { ...category, position },
        update: {},
      });
    }

    for (const [position, category] of SKILL_CATEGORIES.entries()) {
      await tx.skillCategory.upsert({
        where: { slug: category.slug },
        create: { ...category, position },
        update: {},
      });
    }

    for (const [skillPosition, technology] of TECHNOLOGIES.entries()) {
      await tx.technology.upsert({
        where: { slug: technology.slug },
        create: {
          name: technology.name,
          slug: technology.slug,
          showInSkills: true,
          skillPosition,
          skillCategory: { connect: { slug: technology.category } },
        },
        update: {},
      });
    }

    // Pas de clé naturelle unique : on n'insère que dans une table encore vide.
    if ((await tx.skillPillar.count()) === 0) {
      await tx.skillPillar.createMany({
        data: SKILL_PILLARS.map((pillar, position) => ({
          ...pillar,
          position,
        })),
      });
    }

    if ((await tx.timelineEntry.count()) === 0) {
      await tx.timelineEntry.createMany({
        data: TIMELINE_ENTRIES.map((entry, position) => ({
          ...entry,
          position,
        })),
      });
    }
  });
}

main()
  .then(() => console.info("Seed terminé."))
  .catch((error: unknown) => {
    console.error("Échec du seed :", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
