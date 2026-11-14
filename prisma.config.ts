import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

function databaseName(url: string, variable: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    throw new Error(`${variable} n'est pas une URL valide.`);
  }
}

// Garde-fou : `migrate dev` vide intégralement la base shadow. Une confusion
// avec la base principale détruirait les données ; on refuse donc toute
// configuration ambiguë avant même que Prisma ne se connecte.
if (databaseUrl && shadowDatabaseUrl) {
  const main = databaseName(databaseUrl, "DATABASE_URL");
  const shadow = databaseName(shadowDatabaseUrl, "SHADOW_DATABASE_URL");

  if (main === shadow) {
    throw new Error(
      "DATABASE_URL et SHADOW_DATABASE_URL désignent la même base.",
    );
  }
  if (!shadow.endsWith("_shadow")) {
    throw new Error(
      `La base shadow doit se terminer par "_shadow" (reçu : "${shadow}").`,
    );
  }
  if (main.endsWith("_shadow")) {
    throw new Error(
      `La base principale ne peut pas être une base shadow (reçu : "${main}").`,
    );
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // URLs facultatives : `prisma generate` (build, CI) fonctionne sans base.
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl,
  },
});
