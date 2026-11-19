import { ArrowUpRight, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CvLink({
  cvUrl,
  action,
  variant = "section",
}: {
  cvUrl: string;
  action: "download" | "preview";
  variant?: "hero" | "section";
}) {
  const isDownload = action === "download";
  const Icon = isDownload ? FileDown : ArrowUpRight;

  return (
    <a
      href={isDownload ? `${cvUrl}?download=1` : cvUrl}
      target={isDownload ? undefined : "_blank"}
      rel={isDownload ? undefined : "noopener"}
      className={cn(
        "inline-flex h-12 items-center gap-1.5 rounded-full border px-7 text-base font-medium transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none",
        variant === "hero"
          ? "border-white/40 bg-white/5 text-white backdrop-blur-sm hover:border-white hover:bg-white/15 focus-visible:ring-white"
          : "border-foreground/30 bg-foreground/5 text-foreground hover:border-foreground/60 hover:bg-foreground/10 focus-visible:ring-amber-brand",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {isDownload ? "Télécharger mon CV" : "Visualiser mon CV"}
      <span className="sr-only">
        {isDownload ? " (PDF)" : " (PDF, nouvel onglet)"}
      </span>
    </a>
  );
}
