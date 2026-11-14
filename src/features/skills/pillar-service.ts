import { db } from "@/lib/db";
import { withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import type { SkillPillarInput } from "@/features/skills/schemas";

const MESSAGES = { notFound: "Ce pilier n'existe plus. Rechargez la page." };

export async function createSkillPillar(
  input: SkillPillarInput,
): Promise<void> {
  const { _max } = await db.skillPillar.aggregate({ _max: { position: true } });
  await db.skillPillar.create({
    data: { ...input, position: nextPosition(_max.position) },
  });
}

export async function updateSkillPillar(
  id: string,
  input: SkillPillarInput,
): Promise<void> {
  await withDomainErrors(
    db.skillPillar.update({ where: { id }, data: input }),
    MESSAGES,
  );
}

export async function deleteSkillPillar(id: string): Promise<void> {
  await withDomainErrors(db.skillPillar.delete({ where: { id } }), MESSAGES);
}

export async function moveSkillPillar(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const pillars = await db.skillPillar.findMany({
    select: { id: true, position: true },
  });
  const updates = moveInList(pillars, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: pillarId, position }) =>
      db.skillPillar.update({ where: { id: pillarId }, data: { position } }),
    ),
  );
}
