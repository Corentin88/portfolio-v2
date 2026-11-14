"use server";

import { redirect } from "next/navigation";
import { runAdminAction } from "@/features/auth/admin-action";
import {
  createProjectCategory,
  deleteProjectCategory,
  moveProjectCategory,
  updateProjectCategory,
} from "@/features/projects/category-service";
import {
  challengeCreateSchema,
  challengeUpdateSchema,
  projectCategorySchema,
  projectCategoryUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  versionCreateSchema,
  versionUpdateSchema,
} from "@/features/projects/schemas";
import {
  createProject,
  deleteProject,
  moveProject,
  updateProject,
} from "@/features/projects/service";
import {
  addChallenge,
  createVersion,
  deleteChallenge,
  deleteVersion,
  moveChallenge,
  moveVersion,
  updateChallenge,
  updateVersion,
} from "@/features/projects/version-service";
import type { ActionState } from "@/lib/action-result";
import { deleteSchema, moveSchema } from "@/lib/validation";

export async function createProjectCategoryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(projectCategorySchema, formData, async (data) => {
    await createProjectCategory(data);
    return `Catégorie « ${data.name} » ajoutée.`;
  });
}

export async function updateProjectCategoryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    projectCategoryUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateProjectCategory(id, data);
      return "Catégorie enregistrée.";
    },
  );
}

export async function deleteProjectCategoryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await deleteProjectCategory(id);
    return "Catégorie supprimée.";
  });
}

export async function moveProjectCategoryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveProjectCategory(id, direction);
    return "Ordre mis à jour.";
  });
}

// ─────────────────────────────── Projets ───────────────────────────────

export async function createProjectAction(
  _previous: ActionState,
  formData: FormData,
) {
  const created = { id: "" };
  const result = await runAdminAction(
    projectCreateSchema,
    formData,
    async (data) => {
      created.id = await createProject(data);
      return `Projet « ${data.title} » créé en brouillon.`;
    },
  );
  // Redirection hors de runAdminAction : elle interrompt l'action (exception).
  if (result.ok && created.id) redirect(`/admin/projets/${created.id}`);
  return result;
}

export async function updateProjectAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    projectUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateProject(id, data);
      return "Projet enregistré.";
    },
  );
}

export async function deleteProjectAction(
  _previous: ActionState,
  formData: FormData,
) {
  const result = await runAdminAction(
    deleteSchema,
    formData,
    async ({ id }) => {
      const title = await deleteProject(id);
      return `Projet « ${title} » supprimé.`;
    },
  );
  if (result.ok && formData.get("redirectTo") === "list") {
    redirect("/admin/projets");
  }
  return result;
}

export async function moveProjectAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveProject(id, direction);
    return "Ordre mis à jour.";
  });
}

// ─────────────────────────────── Versions ───────────────────────────────

export async function createVersionAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    versionCreateSchema,
    formData,
    async ({ projectId, ...data }) => {
      await createVersion(projectId, data);
      return `Version « ${data.label} » créée en brouillon.`;
    },
  );
}

export async function updateVersionAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    versionUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateVersion(id, data);
      return "Version enregistrée.";
    },
  );
}

export async function deleteVersionAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    const label = await deleteVersion(id);
    return `Version « ${label} » supprimée.`;
  });
}

export async function moveVersionAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveVersion(id, direction);
    return "Ordre mis à jour.";
  });
}

// ─────────────────────────── Difficultés et solutions ───────────────────────────

export async function addChallengeAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    challengeCreateSchema,
    formData,
    async ({ versionId, ...data }) => {
      await addChallenge(versionId, data);
      return "Difficulté ajoutée.";
    },
  );
}

export async function updateChallengeAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    challengeUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateChallenge(id, data);
      return "Difficulté enregistrée.";
    },
  );
}

export async function deleteChallengeAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await deleteChallenge(id);
    return "Difficulté supprimée.";
  });
}

export async function moveChallengeAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveChallenge(id, direction);
    return "Ordre mis à jour.";
  });
}
