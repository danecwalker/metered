import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  hasDollarsPerMu,
  listPublishedIndex,
} from "@/features/catalog/queries";
import { AmbientField } from "@/shared/ui/ambient-field";
import { SiteFooter } from "@/shared/ui/site-footer";
import { SiteHeader } from "@/shared/ui/site-header";
import { SiteMotion } from "@/shared/ui/site-motion";
import { THEME_BOOT } from "@/shared/ui/theme-boot";
import "./globals.css";

export const dynamic = "force-dynamic";

const sans = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-body-src",
  weight: "100 900",
  display: "swap",
});

const mono = localFont({
  src: "../fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono-src",
  weight: "100 800",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const rows = await listPublishedIndex();
  const hasEt = hasDollarsPerMu(rows);
  if (!hasEt) {
    return {
      title: {
        default: "Metered preview",
        template: "%s / Metered",
      },
      description:
        "Published stacks on the same official jobs. Pass coverage stays visible. Run an eval to measure a stack.",
    };
  }
  return {
    title: {
      default: "Metered: official jobs, pass rate, then $ / MU",
      template: "%s / Metered",
    },
    description:
      "Pass rate and cost on the same official jobs. $ / MU is only set when every official task passed. Incomplete runs stay visible and do not rank.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AmbientField />
        <SiteMotion />
        <a className="skip" href="#content">
          Skip to content
        </a>
        <SiteHeader />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
