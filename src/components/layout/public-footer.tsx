import Link from "next/link";
import { ArrowUp, Lock } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/shared/brand-icons";

type PublicFooterProps = {
  githubUrl: string | null;
  linkedinUrl: string | null;
};

const socialClass =
  "flex size-8 items-center justify-center rounded-full border border-white/10 text-sky-soft-const/70 transition-colors hover:border-amber-vivid hover:text-amber-vivid focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none";

export function PublicFooter({ githubUrl, linkedinUrl }: PublicFooterProps) {
  return (
    <footer className="mt-auto border-t border-white/5 bg-ink py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <p className="text-sm text-sky-soft-const/60">
            © <CopyrightYear />{" "}
            <span className="font-medium text-white">Corentin Lanaud</span> —
            Portfolio. Tous droits réservés.
          </p>
          {linkedinUrl || githubUrl ? (
            <div className="flex items-center gap-2">
              {linkedinUrl ? (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Profil LinkedIn de Corentin Lanaud"
                  className={socialClass}
                >
                  <LinkedinIcon className="size-4" />
                </a>
              ) : null}
              {githubUrl ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Profil GitHub de Corentin Lanaud"
                  className={socialClass}
                >
                  <GithubIcon className="size-4" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-5">
          <p className="hidden font-mono text-xs text-sky-soft-const/70 sm:block">
            Fait avec <span className="text-white/80">Next.js</span>
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 font-mono text-xs text-sky-soft-const/70 transition-colors hover:border-white/25 hover:text-sky-soft-const focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none"
          >
            <Lock className="size-3.5" aria-hidden="true" />
            Espace admin
          </Link>
          <a
            href="#hero"
            aria-label="Revenir en haut de page"
            className="flex size-9 items-center justify-center rounded-full border border-white/15 text-sky-soft-const/70 transition-all hover:-translate-y-0.5 hover:border-amber-vivid hover:text-amber-vivid focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}

// L'année dépend de l'horloge : composant séparé, rendu avec le reste de la page à la requête.
function CopyrightYear() {
  return <>{new Date().getFullYear()}</>;
}
