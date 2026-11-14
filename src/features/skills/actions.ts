"use server";

import { runAdminAction } from "@/features/auth/admin-action";
import {
  createSkillPillar,
  deleteSkillPillar,
  moveSkillPillar,
  updateSkillPillar,
} from "@/features/skills/pillar-service";
import {
  skillCategorySchema,
  skillCategoryUpdateSchema,
  skillPillarSchema,
  skillPillarUpdateSchema,
  technologySchema,
  technologyUpdateSchema,
} from "@/features/skills/schemas";
import {
  createSkillCategory,
  deleteSkillCategory,
  moveSkillCategory,
  updateSkillCategory,
} from "@/features/skills/skill-category-service";
import {
  createTechnology,
  deleteTechnology,
  moveTechnology,
  updateTechnology,
} from "@/features/skills/technology-service";
import type { ActionState } from "@/lib/action-result";
import { deleteSchema, moveSchema } from "@/lib/validation";

// ── Technologies ──

export async function createTechnologyAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(technologySchema, formData, async (data) => {
    await createTechnology(data);
    return `Technologie « ${data.name} » ajoutée.`;
  });
}

export async function updateTechnologyAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    technologyUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateTechnology(id, data);
      return "Technologie enregistrée.";
    },
  );
}

export async function deleteTechnologyAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await deleteTechnology(id);
    return "Technologie supprimée.";
  });
}

export async function moveTechnologyAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveTechnology(id, direction);
    return "Ordre mis à jour.";
  });
}

// ── Catégories de compétences ──

export async function createSkillCategoryAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(skillCategorySchema, formData, async (data) => {
    await createSkillCategory(data);
    return `Catégorie « ${data.name} » ajoutée.`;
  });
}

export async function updateSkillCategoryAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    skillCategoryUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateSkillCategory(id, data);
      return "Catégorie enregistrée.";
    },
  );
}

export async function deleteSkillCategoryAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    const detached = await deleteSkillCategory(id);
    return detached > 0
      ? `Catégorie supprimée : ${detached} technologie(s) passent dans « Autres ».`
      : "Catégorie supprimée.";
  });
}

export async function moveSkillCategoryAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveSkillCategory(id, direction);
    return "Ordre mis à jour.";
  });
}

// ── Piliers ──

export async function createSkillPillarAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(skillPillarSchema, formData, async (data) => {
    await createSkillPillar(data);
    return "Pilier ajouté.";
  });
}

export async function updateSkillPillarAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    skillPillarUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateSkillPillar(id, data);
      return "Pilier enregistré.";
    },
  );
}

export async function deleteSkillPillarAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await deleteSkillPillar(id);
    return "Pilier supprimé.";
  });
}

export async function moveSkillPillarAction(
  _p: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveSkillPillar(id, direction);
    return "Ordre mis à jour.";
  });
}
