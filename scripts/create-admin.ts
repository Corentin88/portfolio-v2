import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/features/auth/password";
import {
  adminEmailSchema,
  newAdminPasswordSchema,
} from "@/features/auth/schemas";
import { createTerminalPrompt } from "./terminal-prompt";

// Création du compte administrateur unique. Les identifiants sont saisis au
// clavier uniquement : ni argument, ni variable d'environnement, ni fichier,
// et le mot de passe n'est jamais affiché ni écrit ailleurs que sous forme d'empreinte.

const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Nom requis." })
  .max(80, { error: "80 caractères maximum." });

const terminal = createTerminalPrompt(process.stdin, process.stdout);
const ask = terminal.ask;

async function askValid<T>(
  prompt: string,
  schema: z.ZodType<T>,
  hidden = false,
): Promise<T> {
  for (;;) {
    const parsed = schema.safeParse(await ask(prompt, hidden));
    if (parsed.success) return parsed.data;
    console.error(`  ${parsed.error.issues[0]?.message ?? "Valeur invalide."}`);
  }
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Ce script doit être lancé dans un terminal interactif (aucune saisie redirigée).",
    );
  }
  if ((await db.adminUser.count()) > 0) {
    throw new Error(
      "Un compte administrateur existe déjà : un seul compte est autorisé.",
    );
  }

  console.log("Création du compte administrateur de Portfolio 2.0\n");
  const email = await askValid("E-mail : ", adminEmailSchema);
  const displayName = await askValid("Nom affiché : ", displayNameSchema);

  let password: string;
  for (;;) {
    password = await askValid(
      "Mot de passe (12 caractères minimum, saisie masquée) : ",
      newAdminPasswordSchema,
      true,
    );
    if ((await ask("Confirmation : ", true)) === password) break;
    console.error("  Les deux saisies diffèrent, recommencez.");
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    // Revérification dans la transaction : jamais deux comptes, même en cas d'exécution concurrente.
    if ((await tx.adminUser.count()) > 0) {
      throw new Error("Un compte administrateur a été créé entre-temps.");
    }
    await tx.adminUser.create({
      data: {
        email,
        displayName,
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
  });

  console.log("\nCompte administrateur créé.");
}

main()
  .catch((error: unknown) => {
    console.error(
      `\nÉchec : ${error instanceof Error ? error.message : "erreur inconnue"}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    terminal.close();
    await db.$disconnect();
  });
