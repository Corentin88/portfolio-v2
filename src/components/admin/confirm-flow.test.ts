import { describe, expect, it } from "vitest";
import {
  isConfirmDialogOpen,
  shouldAskConfirmation,
  type ConfirmPhase,
} from "@/components/admin/confirm-flow";

type State = { ok: boolean } | null;

const confirmation = { title: "Supprimer « X » ?", message: "Définitif." };

describe("shouldAskConfirmation", () => {
  it("retient la soumission quand une confirmation est demandée", () => {
    expect(shouldAskConfirmation(confirmation, false)).toBe(true);
  });

  it("laisse passer la re-soumission qui suit la confirmation", () => {
    expect(shouldAskConfirmation(confirmation, true)).toBe(false);
  });

  it("n'intercepte jamais un formulaire sans confirmation", () => {
    expect(shouldAskConfirmation(undefined, false)).toBe(false);
  });
});

describe("isConfirmDialogOpen", () => {
  const before: State = null;

  it("fermée au repos, ouverte pendant la demande", () => {
    expect(isConfirmDialogOpen<State>({ step: "idle" }, before)).toBe(false);
    expect(isConfirmDialogOpen<State>({ step: "asking" }, before)).toBe(true);
  });

  it("reste ouverte (boutons désactivés) tant que l'action n'a pas répondu", () => {
    const phase: ConfirmPhase<State> = {
      step: "submitting",
      stateAtSubmit: before,
    };
    expect(isConfirmDialogOpen(phase, before)).toBe(true);
  });

  it("se ferme dès le résultat de l'action, succès comme erreur", () => {
    const phase: ConfirmPhase<State> = {
      step: "submitting",
      stateAtSubmit: before,
    };
    expect(isConfirmDialogOpen(phase, { ok: true })).toBe(false);
    expect(isConfirmDialogOpen(phase, { ok: false })).toBe(false);
  });

  it("une seconde suppression attend son propre résultat", () => {
    const first: State = { ok: false };
    const phase: ConfirmPhase<State> = {
      step: "submitting",
      stateAtSubmit: first,
    };
    expect(isConfirmDialogOpen(phase, first)).toBe(true);
    expect(isConfirmDialogOpen(phase, { ok: true })).toBe(false);
  });
});
