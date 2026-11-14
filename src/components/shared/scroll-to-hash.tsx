"use client";

import { useEffect } from "react";

/** Identifiant ciblé par l'ancre (« #projets » → « projets »), ou null si invalide. */
export function hashTargetId(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  return /^[A-Za-z][\w-]{0,63}$/.test(id) ? id : null;
}

/** Délai maximal d'attente de la section (contenu encore en cours de streaming). */
const MAX_WAIT_MS = 3000;

/**
 * Amène la section de l'ancre (/#projets) sous l'en-tête fixe. Les sections
 * arrivent après un <Suspense> : au moment de la navigation, l'élément est absent
 * ou encore masqué, et ni le navigateur ni le routeur ne peuvent s'y placer
 * (scrollIntoView sur un élément non affiché ne fait rien). On attend donc qu'il
 * soit affiché. Le décalage de l'en-tête vient de scroll-padding-top (globals.css).
 */
export function ScrollToHash() {
  useEffect(() => {
    const id = hashTargetId(window.location.hash);
    if (!id) return;
    const started = performance.now();
    let frame = 0;
    const tryScroll = () => {
      const target = document.getElementById(id);
      if (target && target.getClientRects().length > 0) {
        // Sans l'animation de scroll-behavior: smooth.
        target.scrollIntoView({ block: "start", behavior: "instant" });
        return;
      }
      if (performance.now() - started < MAX_WAIT_MS) {
        frame = requestAnimationFrame(tryScroll);
      }
    };
    frame = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}
