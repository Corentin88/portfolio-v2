import { db } from "@/lib/db";
import { getMediaRoot } from "@/lib/env";
import { auditMediaStorage } from "@/features/media/service";

// Audit en lecture seule du stockage des médias : rien n'est supprimé ni modifié.
// Les médias non utilisés se gèrent depuis l'administration (Médias → Non utilisés).

async function main(): Promise<void> {
  console.log(`Racine des médias : ${getMediaRoot()}`);
  const { missingFiles, orphanFiles } = await auditMediaStorage();

  console.log(
    `\nFichiers manquants (référencés en base) : ${missingFiles.length}`,
  );
  for (const key of missingFiles) console.log(`  - ${key}`);

  console.log(
    `\nFichiers orphelins (absents de la base) : ${orphanFiles.length}`,
  );
  for (const key of orphanFiles) console.log(`  - ${key}`);

  if (missingFiles.length > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
