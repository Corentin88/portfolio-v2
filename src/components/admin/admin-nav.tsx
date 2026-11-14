"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/projets", label: "Projets" },
  { href: "/admin/contenus", label: "Contenus" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/competences", label: "Compétences" },
  { href: "/admin/technologies", label: "Technologies" },
  { href: "/admin/timeline", label: "Timeline" },
  { href: "/admin/categories", label: "Catégories de projets" },
  { href: "/admin/medias", label: "Médias et CV" },
] as const;

/** Barre latérale sur ordinateur, bandeau défilant horizontalement sur mobile. */
export function AdminNav({ unreadMessages }: { unreadMessages: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation de l'administration">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-royal text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
                {item.href === "/admin/messages" && unreadMessages > 0 ? (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-vivid px-1.5 font-mono text-[11px] font-semibold text-amber-ink">
                    {unreadMessages}
                    <span className="sr-only">
                      {unreadMessages > 1 ? " non lus" : " non lu"}
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
