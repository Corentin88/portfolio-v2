import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Corentin Lanaud — Développeur full-stack",
  description: "Portfolio de Corentin Lanaud, développeur full-stack.",
};

// « modal » : fiche projet en modale (route interceptée @modal/(.)projets/[slug]).
export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    // next-themes pose la classe du thème sur <html> avant l'hydratation.
    <html
      lang="fr"
      suppressHydrationWarning
      // Défilement fluide (globals.css) suspendu par Next pendant les changements de route.
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          {modal}
        </ThemeProvider>
      </body>
    </html>
  );
}
