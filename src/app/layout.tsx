import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import {
  hasEffectivePerMillion,
  listPublishedIndex,
} from "@/features/catalog/queries";
import { AmbientField } from "@/shared/ui/ambient-field";
import { SiteFooter } from "@/shared/ui/site-footer";
import { SiteHeader } from "@/shared/ui/site-header";
import { SiteMotion } from "@/shared/ui/site-motion";
import "./globals.css";

export const dynamic = "force-dynamic";

const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display-src",
  weight: ["400", "500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body-src",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-src",
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const rows = await listPublishedIndex();
  const hasEt = hasEffectivePerMillion(rows);
  if (!hasEt) {
    return {
      title: {
        default: "Metered preview",
        template: "%s · Metered",
      },
      description:
        "Published stacks on the same official jobs. Pass coverage stays visible. Run an eval to measure a stack.",
    };
  }
  return {
    title: {
      default: "Metered — official jobs, pass rate, then $ / M ET",
      template: "%s · Metered",
    },
    description:
      "Pass rate and cost on the same official jobs. $ / M ET is only set when every official task passed. Incomplete runs stay visible and do not rank.",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
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
