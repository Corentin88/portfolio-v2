"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

/** Ancre de la page courante (#…) ou d'une section de l'accueil depuis une autre page (/#…). */
export type NavLink = { href: `#${string}` | `/#${string}`; label: string };

type PublicHeaderProps = {
  links: NavLink[];
  /** Lien du nom en haut à gauche : haut de page sur l'accueil, accueil ailleurs. */
  brandHref?: string;
  /** Lien « Discutons » : absent tant qu'aucun moyen de contact réel n'est configuré. */
  contactHref: string | null;
};

const ctaClass =
  "inline-flex items-center justify-center rounded-full bg-amber-vivid font-semibold text-amber-ink transition-colors hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

export function PublicHeader({
  links,
  contactHref,
  brandHref = "#hero",
}: PublicHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Met en évidence le lien de la section visible.
  useEffect(() => {
    // Seules les ancres de la page courante peuvent être suivies.
    const sections = links
      .filter((link) => link.href.startsWith("#"))
      .map((link) => document.querySelector<HTMLElement>(link.href))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [links]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const solid = scrolled || menuOpen;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid
          ? "border-b border-white/10 bg-panel-dark/90 shadow-lg shadow-black/20 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-[4.5rem]"
      >
        <a
          href={brandHref}
          aria-label={
            brandHref === "#hero"
              ? "Corentin Lanaud — retour en haut"
              : "Corentin Lanaud — accueil"
          }
          className="group flex items-baseline font-display text-lg font-bold tracking-tight text-white focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none sm:text-xl"
        >
          Corentin
          <span className="text-amber-vivid transition-transform duration-300 group-hover:translate-x-0.5">
            .
          </span>
          Lanaud
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={active === link.href ? "location" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 font-mono text-[13px] tracking-wide transition-colors hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none",
                  active === link.href
                    ? "text-amber-vivid"
                    : "text-sky-soft-const/85",
                )}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-amber-vivid transition-transform duration-300",
                    active === link.href ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </a>
            </li>
          ))}
          <li className="ml-1 flex items-center gap-1">
            <ThemeToggle className="text-white hover:bg-white/10" />
            {contactHref ? (
              <a
                href={contactHref}
                className={cn(ctaClass, "h-8 px-3 text-sm")}
              >
                Discutons
                <ArrowUpRight className="ml-1 size-4" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        </ul>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle className="text-white hover:bg-white/10" />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex size-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none"
          >
            {menuOpen ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <nav
          id="mobile-menu"
          aria-label="Menu mobile"
          className="border-t border-white/10 bg-panel-dark px-4 pt-2 pb-5 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-3 font-mono text-sm tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none",
                    active === link.href
                      ? "bg-white/10 text-amber-vivid"
                      : "text-sky-soft-const hover:bg-white/5 hover:text-white",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
            {contactHref ? (
              <li className="mt-3">
                <a
                  href={contactHref}
                  onClick={() => setMenuOpen(false)}
                  className={cn(ctaClass, "h-11 w-full")}
                >
                  Discutons !
                </a>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
