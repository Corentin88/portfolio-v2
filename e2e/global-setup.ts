import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { E2E_STORAGE, e2eServerEnv } from "./support/e2e-env";

function run(command: string, env: Record<string, string>): string {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(
      `Échec de « ${command} » :\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

/**
 * Prépare la base E2E (garde-fou `_e2e` dans e2eServerEnv) : migrations existantes
 * appliquées (idempotent), puis données fictives. Les clés de médias générées sont
 * transmises aux tests par un fichier, sans accès à la base depuis les tests.
 */
export default function globalSetup() {
  const env = e2eServerEnv();
  run("npx prisma migrate deploy", env);
  const output = run("npx tsx e2e/support/seed.ts", env);
  const fixtures = output.trim().split("\n").at(-1) ?? "{}";
  mkdirSync(E2E_STORAGE, { recursive: true });
  writeFileSync(path.join(E2E_STORAGE, "fixtures.json"), fixtures);
}
