/**
 * Remplit la base E2E avec des données entièrement fictives, après l'avoir vidée.
 * Lancé par e2e/global-setup.ts (via tsx) avec DATABASE_URL et MEDIA_ROOT de test.
 * N'utilise jamais de données réelles : aucune lecture de la base principale.
 */
import { rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/features/auth/password";
import { processImage } from "@/features/media/image-processing";
import { writeMediaFiles } from "@/lib/media-storage";
import { newDocumentKey, newImageKey, thumbnailKey } from "@/lib/media-keys";
import { ADMIN, E2E_STORAGE, assertE2eDatabase } from "./e2e-env";

const databaseUrl = process.env.DATABASE_URL ?? "";
assertE2eDatabase(databaseUrl);
if (!process.env.MEDIA_ROOT?.startsWith(E2E_STORAGE)) {
  throw new Error("MEDIA_ROOT doit pointer vers storage/e2e.");
}

async function resetDatabase() {
  // Ordre imposé par les clés étrangères (Restrict).
  await db.versionScreenshot.deleteMany();
  await db.versionTechnology.deleteMany();
  await db.versionHighlight.deleteMany();
  await db.versionChallenge.deleteMany();
  await db.projectVersion.deleteMany();
  await db.project.deleteMany();
  await db.projectCategory.deleteMany();
  await db.technology.deleteMany();
  await db.skillCategory.deleteMany();
  await db.skillPillar.deleteMany();
  await db.timelineEntry.deleteMany();
  await db.siteSettings.deleteMany();
  await db.media.deleteMany();
  // Dossiers en Restrict sur leur parent : des feuilles vers la racine.
  // MariaDB refuse un DELETE filtré par une sous-requête sur la même table :
  // les feuilles sont lues d'abord, puis supprimées par identifiant.
  for (;;) {
    const leaves = await db.mediaFolder.findMany({
      where: { children: { none: {} } },
      select: { id: true },
    });
    if (leaves.length === 0) break;
    await db.mediaFolder.deleteMany({
      where: { id: { in: leaves.map((leaf) => leaf.id) } },
    });
  }
  await db.contactMessage.deleteMany();
  await db.adminUser.deleteMany();
}

const PALETTE = ["#1e3a8a", "#b45309", "#065f46", "#7c2d12", "#4c1d95"];

async function createImage(label: string, index: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <rect width="100%" height="100%" fill="${PALETTE[index % PALETTE.length]}"/>
    <text x="80" y="480" font-family="sans-serif" font-size="96" fill="#fff">${label}</text>
  </svg>`;
  const input = Buffer.from(svg);
  const { original, thumbnail } = await processImage(input);
  const storageKey = newImageKey();
  await writeMediaFiles([
    { key: storageKey, data: original.data },
    { key: thumbnailKey(storageKey), data: thumbnail.data },
  ]);
  return db.media.create({
    data: {
      kind: "IMAGE",
      storageKey,
      originalName: `${label}.png`,
      mimeType: "image/webp",
      sizeBytes: original.data.byteLength,
      width: original.width,
      height: original.height,
      alt: `Capture fictive : ${label}`,
      checksum: createHash("sha256").update(input).digest("hex"),
    },
  });
}

const MINIMAL_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

async function createCv() {
  const data = Buffer.from(MINIMAL_PDF);
  const storageKey = newDocumentKey();
  await writeMediaFiles([{ key: storageKey, data }]);
  return db.media.create({
    data: {
      kind: "DOCUMENT",
      storageKey,
      originalName: "cv-fictif.pdf",
      mimeType: "application/pdf",
      sizeBytes: data.byteLength,
    },
  });
}

async function main() {
  await rm(E2E_STORAGE, { recursive: true, force: true });
  await resetDatabase();

  await db.adminUser.create({
    data: {
      email: ADMIN.email,
      displayName: ADMIN.name,
      passwordHash: await hashPassword(ADMIN.password),
    },
  });

  const cv = await createCv();
  await db.siteSettings.create({
    data: {
      id: 1,
      heroStatusLabel: "Profil fictif de démonstration",
      heroRoleLine: "Développeur full-stack fictif",
      heroTagline: "Des applications web de démonstration",
      heroTaglineSub: "Contenu généré pour les tests automatisés.",
      presentationTitle: "Présentation fictive",
      presentationBody:
        "Premier paragraphe de démonstration.\n\nSecond paragraphe de démonstration.",
      presentationQuote: "Une citation de test.",
      // Domaine non réservé : le formulaire s'affiche ; aucun e-mail n'est envoyé (Resend désactivé).
      contactEmail: "contact@portfolio-e2e.fr",
      availabilityNote: "Disponibilité fictive",
      githubUrl: "https://github.com/exemple-e2e",
      linkedinUrl: null,
      seoTitle: "Portfolio E2E — Développeur fictif",
      seoDescription: "Portfolio de démonstration utilisé par les tests E2E.",
      cvMediaId: cv.id,
    },
  });

  const skillCategory = await db.skillCategory.create({
    data: { name: "Front-end", slug: "front-end", position: 0 },
  });
  const [typescript, react] = await Promise.all(
    ["TypeScript", "React"].map((name, index) =>
      db.technology.create({
        data: {
          name,
          slug: name.toLowerCase(),
          showInSkills: true,
          skillPosition: index,
          skillCategoryId: skillCategory.id,
        },
      }),
    ),
  );
  await db.skillPillar.create({
    data: { title: "Qualité", description: "Pilier fictif.", position: 0 },
  });
  await db.timelineEntry.create({
    data: {
      periodLabel: "2025",
      title: "Étape fictive",
      description: "Entrée de parcours de démonstration.",
    },
  });

  const category = await db.projectCategory.create({
    data: { name: "Web", slug: "web", position: 0 },
  });

  const shots: Awaited<ReturnType<typeof createImage>>[] = [];
  for (let index = 0; index < 4; index += 1) {
    shots.push(await createImage(`Atlas ${index + 1}`, index));
  }
  const draftShot = await createImage("Brouillon", 4);
  const now = new Date();

  await db.project.create({
    data: {
      title: "Atlas Démo",
      slug: "atlas-demo",
      summary: "Projet fictif à deux versions pour les tests E2E.",
      context: "Projet de test",
      status: "PUBLISHED",
      publishedAt: now,
      position: 0,
      featured: true,
      categoryId: category.id,
      versions: {
        create: [0, 1].map((index) => ({
          slug: `v${index + 1}`,
          label: `Version ${index + 1}`,
          description: `Description fictive de la version ${index + 1}.`,
          status: "PUBLISHED" as const,
          publishedAt: now,
          position: index,
          highlights: {
            create: [
              { kind: "FEATURE" as const, text: `Fonctionnalité ${index + 1}` },
            ],
          },
          technologies: {
            create: [
              { technologyId: typescript!.id, position: 0 },
              { technologyId: react!.id, position: 1 },
            ],
          },
          screenshots: {
            create: shots
              .slice(index * 2, index * 2 + 2)
              .map((media, position) => ({ mediaId: media.id, position })),
          },
        })),
      },
    },
  });

  await db.project.create({
    data: {
      title: "Borealis Démo",
      slug: "borealis-demo",
      summary: "Second projet fictif, sans capture.",
      status: "PUBLISHED",
      publishedAt: now,
      position: 1,
      categoryId: category.id,
      versions: {
        create: {
          slug: "v1",
          label: "Version unique",
          description: "Description fictive.",
          status: "PUBLISHED",
          publishedAt: now,
        },
      },
    },
  });

  await db.project.create({
    data: {
      title: "Projet brouillon",
      slug: "projet-brouillon",
      summary: "Ne doit jamais être visible publiquement.",
      status: "DRAFT",
      position: 2,
      categoryId: category.id,
      versions: {
        create: {
          slug: "v1",
          label: "Brouillon",
          description: "Version brouillon.",
          screenshots: { create: { mediaId: draftShot.id } },
        },
      },
    },
  });

  await createMediaVolume();

  await db.contactMessage.create({
    data: {
      name: "Visiteur Fictif",
      email: "visiteur@exemple-e2e.fr",
      subject: "Message de fixture",
      message: "Bonjour, ceci est un message fictif pour les tests.",
    },
  });

  // Clés publiées pour les tests (lecture seule) : médias publics et privés.
  console.log(
    JSON.stringify({
      publicShot: shots[0]!.storageKey,
      draftShot: draftShot.storageKey,
    }),
  );
}

/**
 * Volume de la médiathèque (pagination, recherche, sélection multiple) : 150
 * lignes Media sans fichier sur le disque — leurs miniatures répondent 404, ce
 * qui suffit aux tests et évite d'écrire 300 fichiers.
 */
async function createMediaVolume() {
  const volume = await db.mediaFolder.create({ data: { name: "Volume" } });
  await db.mediaFolder.create({
    data: { name: "Lot A", parentId: volume.id },
  });
  const start = Date.UTC(2026, 0, 1);
  await db.media.createMany({
    data: Array.from({ length: 150 }, (_, index) => {
      const number = String(index + 1).padStart(3, "0");
      return {
        kind: "IMAGE" as const,
        storageKey: newImageKey(),
        originalName: `volume-${number}.png`,
        mimeType: "image/webp",
        sizeBytes: 1024 + index,
        width: 1600,
        height: 900,
        alt: `Capture de volume ${number}`,
        folderId: volume.id,
        // Dates croissantes : ordre « plus récents » déterministe (150 → 1).
        createdAt: new Date(start + index * 60_000),
      };
    }),
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
