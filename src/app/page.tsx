import type { Metadata } from "next";
import { ArrowRight, BookOpen, Play } from "lucide-react";
import Link from "next/link";
import {
  hasDollarsPerMu,
  listPublishedIndex,
} from "@/features/catalog/queries";
import { OFFICIAL_TASK_COUNT } from "@/features/eval/suite";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";
import { IndexTable } from "@/shared/ui/index-table";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const rows = await listPublishedIndex();
  if (!hasDollarsPerMu(rows)) {
    return {
      title: "Metered preview",
      description:
        "Published stacks on the same official jobs. Pass coverage stays visible. Run an eval to measure a stack.",
    };
  }
  return {
    title: "$ / MU to finish the work",
    description:
      "Stacks that finished every official task, ranked by dollars per Metered Unit. Incomplete runs stay labeled and do not get a $ / MU.",
  };
}

export default async function HomePage() {
  const rows = await listPublishedIndex();
  const hasEt = hasDollarsPerMu(rows);
  const preview = rows.slice(0, 5);

  return (
    <>
      <section className="wrap hero">
        {!hasEt ? (
          <aside className="banner" role="status">
            <strong>Preview.</strong> No stack has finished the official job
            with a bill yet. <Link href="/eval">Run an eval</Link>
            {" / "}
            <Link href="/methodology">Method</Link>
          </aside>
        ) : null}
        <div>
          {hasEt ? (
            <p className="hero__stat tnum">
              ${" "}
              <span className="hero__unit">/ MU</span>
            </p>
          ) : (
            <p className="model-meta tnum">
              Passed / official {OFFICIAL_TASK_COUNT}
            </p>
          )}
          <h1 className="hero__headline">
            {hasEt
              ? "Same jobs. What do you actually pay."
              : "Same jobs. No complete finish yet."}
          </h1>
          <p className="hero__lede">
            {hasEt ? (
              <>
                A cheap sticker can still be expensive. So can the harness. GPT
                in ChatGPT is not GPT in OpenCode. The index ranks stacks that
                finished every official task, on $ / MU.
                Incomplete runs are not cheap.
              </>
            ) : (
              <>
                Published stacks on the same official jobs. Pass counts stay
                visible. Incomplete runs stay labeled. Run an eval to measure a
                stack, or read how we count.
              </>
            )}
          </p>
          <div className="hero__actions">
            <Link
              className="bg-accent text-accent-ink hover:text-accent-ink inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-transparent px-4 text-sm font-medium no-underline"
              href="/stacks"
            >
              All stacks
              <ArrowRight className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            </Link>
            {!hasEt ? (
              <Link
                className="bg-paper-2 text-ink border-rule-2 hover:bg-paper-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium no-underline"
                href="/eval"
              >
                <Play className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Run an eval
              </Link>
            ) : null}
            <Link
              className="bg-paper-2 text-ink border-rule-2 hover:bg-paper-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium no-underline"
              href="/methodology"
            >
              <BookOpen className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              How we count
            </Link>
          </div>
        </div>
        {hasEt ? (
          <aside className="code-card" aria-label="Work Price formula">
            <div className="code-card__bar">
              <span>work-price.ts</span>
              <span className="status-chip">{WORK_SUITE_VERSION}</span>
            </div>
            <pre>
              <span className="tok-key">$ / MU</span>
              {"    = $ billed / work MU\n"}
              <span className="tok-key">Work MU</span>
              {"    = official job chars / 4\n"}
              <span className="tok-key">Rank</span>
              {"       only if every task passed\n"}
              {"               retries stay in $ billed"}
            </pre>
          </aside>
        ) : (
          <aside className="code-card" aria-label="How to evaluate">
            <div className="code-card__bar">
              <span>how-to-eval.md</span>
              <span className="status-chip">preview</span>
            </div>
            <pre>
              {"Same official jobs. Same tasks.\n"}
              {`Coverage is Passed / official ${OFFICIAL_TASK_COUNT}.\n`}
              {"This list is published stacks.\n"}
              {"Run an eval to measure a stack.\n"}
              {"Method is on /methodology."}
            </pre>
          </aside>
        )}
      </section>

      <section className="wrap section">
        <h2 className="section__title">
          {hasEt ? "Cheapest to finish" : "A few published stacks"}
        </h2>
        <p className="section__lede">
          Cheapest complete finish first. The full list, filters, and every
          column live on <Link href="/stacks">Stacks</Link>.
        </p>
        <IndexTable rows={preview} variant="preview" />
        {rows.length > 0 ? (
          <p className="mt-6">
            <Link
              className="bg-paper-2 text-ink border-rule-2 hover:bg-paper-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium no-underline"
              href="/stacks"
            >
              {rows.length > preview.length
                ? `All ${rows.length} stacks`
                : "Open the full table"}
              <ArrowRight className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            </Link>
          </p>
        ) : null}
      </section>
    </>
  );
}
