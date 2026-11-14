import { describe, expect, it } from "vitest";
import { showModalUntilHidden } from "@/components/shared/use-modal-dialog";

/** Dialogue simulé : distingue « ouvert » et « ouvert en modal », comme le navigateur. */
function fakeDialog(initiallyOpen = false) {
  const calls: string[] = [];
  const dialog = {
    open: initiallyOpen,
    modal: false,
    showModal() {
      if (this.open) throw new Error("InvalidStateError: déjà ouvert");
      this.open = true;
      this.modal = true;
      calls.push("showModal");
    },
    close() {
      this.open = false;
      this.modal = false;
      calls.push("close");
    },
  };
  return { dialog, calls };
}

describe("showModalUntilHidden", () => {
  it("ouvre le dialogue en modal et bloque le défilement", () => {
    const { dialog } = fakeDialog();
    const root = { style: { overflow: "" } };
    showModalUntilHidden(dialog, root);
    expect(dialog.modal).toBe(true);
    expect(root.style.overflow).toBe("hidden");
  });

  it("referme le dialogue quand Activity masque la route, et libère le défilement", () => {
    const { dialog } = fakeDialog();
    const root = { style: { overflow: "auto" } };
    const hide = showModalUntilHidden(dialog, root);
    hide();
    expect(dialog.open).toBe(false);
    expect(root.style.overflow).toBe("auto");
  });

  it("rouvre en modal à chaque cycle ouverture / fermeture", () => {
    const { dialog, calls } = fakeDialog();
    for (let cycle = 0; cycle < 3; cycle++) {
      const hide = showModalUntilHidden(dialog, null);
      expect(dialog.modal).toBe(true);
      hide();
    }
    expect(calls).toEqual([
      "showModal",
      "close",
      "showModal",
      "close",
      "showModal",
      "close",
    ]);
  });

  it("rend modal un dialogue resté « open » mais non modal (bug du lot 7)", () => {
    // État laissé par une route masquée sans fermeture : open, mais plus modal.
    const { dialog } = fakeDialog(true);
    showModalUntilHidden(dialog, null);
    expect(dialog.open).toBe(true);
    expect(dialog.modal).toBe(true);
  });

  it("ne touche pas au défilement sans élément racine (lightbox)", () => {
    const { dialog } = fakeDialog();
    const hide = showModalUntilHidden(dialog, null);
    expect(() => hide()).not.toThrow();
    expect(dialog.open).toBe(false);
  });
});
