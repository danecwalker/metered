import type { Metadata } from "next";
import { Layers } from "lucide-react";
import {
  hasDollarsPerMu,
  listPublishedIndex,
} from "@/features/catalog/queries";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";
import { StacksBrowser } from "@/shared/ui/stacks-browser";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const rows = await listPublishedIndex();
  if (!hasDollarsPerMu(rows)) {
    return {
      title: "Stacks",
      description:
        "Published model × harness stacks on the official suite. Pass coverage stays on every row.",
    };
  }
  return {
    title: "Stacks",
    description:
      "Every published stack, with harness, endpoint, pass coverage, and $ / MU when the official suite finished.",
  };
}

export default async function StacksPage() {
  const rows = await listPublishedIndex();
  const hasEt = hasDollarsPerMu(rows);

  return (
    <section className="wrap section">
      <p className="text-muted mb-2 inline-flex items-center gap-1.5 text-sm">
        <Layers className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        {WORK_SUITE_VERSION}
        {" / "}
        {rows.length} published
      </p>
      <h1 className="section__title">Stacks</h1>
      <p className="section__lede">
        {hasEt
          ? "Model × harness × endpoint. $ / MU only after every official task passed. Incomplete runs stay on the list and do not rank."
          : "Only stacks with an official run. Pass counts stay visible. Incomplete runs stay labeled."}
      </p>
      <StacksBrowser rows={rows} />
    </section>
  );
}
