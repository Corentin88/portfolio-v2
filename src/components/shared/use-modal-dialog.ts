"use client";

import { useLayoutEffect, type RefObject } from "react";

type ModalDialog = Pick<HTMLDialogElement, "open" | "showModal" | "close">;

/**
 * Ouvre le dialogue en modal et renvoie de quoi le refermer.
 *
 * Avec cacheComponents, Next masque une route quittée avec <Activity> au lieu de
 * la démonter : le <dialog> reste alors « open » mais n'est plus modal. Le rouvrir
 * en vérifiant seulement `open` donnait un dialogue non modal (sans fond, ni
 * focus piégé, ni Échap). On le referme donc à chaque masquage et on le rouvre
 * en modal à chaque affichage.
 */
export function showModalUntilHidden(
  dialog: ModalDialog,
  root: { style: { overflow: string } } | null,
): () => void {
  if (dialog.open) dialog.close();
  dialog.showModal();
  // Le dialogue natif ne bloque pas le défilement de la page en dessous.
  const previousOverflow = root?.style.overflow ?? "";
  if (root) root.style.overflow = "hidden";
  return () => {
    if (dialog.open) dialog.close();
    if (root) root.style.overflow = previousOverflow;
  };
}

/** Dialogue modal tant que le composant est affiché (montage ou retour d'Activity). */
export function useModalDialog(
  ref: RefObject<HTMLDialogElement | null>,
  { lockScroll = true }: { lockScroll?: boolean } = {},
): void {
  // useLayoutEffect : la fermeture précède le masquage, sans état intermédiaire visible.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    return showModalUntilHidden(
      dialog,
      lockScroll ? document.documentElement : null,
    );
  }, [ref, lockScroll]);
}
