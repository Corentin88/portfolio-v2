import { connection } from "next/server";
import { pingDatabase } from "@/lib/db";

/**
 * Sonde de santé (healthcheck Docker, supervision externe) : 200 si l'application
 * et la base répondent, 503 sinon. Aucun détail technique dans la réponse.
 */
export async function GET() {
  await connection();
  const ok = await pingDatabase();
  if (!ok) {
    console.warn(
      JSON.stringify({ level: "warn", message: "health.database_unreachable" }),
    );
  }
  return Response.json(
    { status: ok ? "ok" : "error" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
