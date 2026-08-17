import type { Metadata } from "next";
import Link from "next/link";
import {
  hasEffectivePerMillion,
  listPublishedIndex,
} from "@/features/catalog/queries";
import { OFFICIAL_TASK_COUNT } from "@/features/eval/suite";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";
import { IndexTable } from "@/shared/ui/index-table";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const rows = await listPublishedIndex();
  if (!hasEffectivePerMillion(rows)) {
    return {
      title: "Metered preview",
      description:
        "Published stacks on the same official jobs. Pass coverage stays visible. Run an eval to measure a stack.",
    };
  }
  return {
    title: "$ / M ET to finish the work",
    description:
      "Stacks that finished every official task, ranked by dollars per million effective tokens. Incomplete runs stay labeled and do not get a $ / M ET.",
  };
}

export default async function HomePage() {
  const rows = await listPublishedIndex();
  const hasEt = hasEffectivePerMillion(rows);

  return (
    <>
      <section className="wrap hero" data-hero>
        {!hasEt ? (
          <aside className="banner" role="status" data-hero-item>
            <strong>Preview.</strong> No complete official suite is on the
            board yet. Coverage is Passed / official {OFFICIAL_TASK_COUNT}.{" "}
            <Link href="/eval">Run an eval</Link>
            {" · "}
            <Link href="/methodology">Method</Link>
          </aside>
        ) : null}
        <div>
          {hasEt ? (
            <p className="hero__stat tnum" data-hero-item>
              ${" "}
              <span className="hero__unit">/ M ET</span>
            </p>
          ) : (
            <p className="model-meta tnum" data-hero-item>
              Passed / official {OFFICIAL_TASK_COUNT}
            </p>
          )}
          <h1 className="hero__headline" data-hero-item>
            {hasEt
              ? "Same jobs. What do you actually pay."
              : "Same jobs. No complete finish yet."}
          </h1>
          <p className="hero__lede" data-hero-item>
            {hasEt ? (
              <>
                A cheap sticker can still be expensive. So can the harness. GPT
                in ChatGPT is not GPT in OpenCode. The index ranks stacks that
                finished every official task, on $ / million effective tokens.
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
          <div className="hero__actions" data-hero-item>
            <a className="btn btn--primary" href={hasEt ? "#index" : "#stacks"}>
              {hasEt ? "Open the index" : "See published stacks"}
            </a>
            {!hasEt ? (
              <Link className="btn" href="/eval">
                Run an eval
              </Link>
            ) : null}
            <Link className="btn" href="/methodology">
              How we count
            </Link>
          </div>
        </div>
        {hasEt ? (
          <aside className="code-card" aria-label="Work Price formula" data-hero-item>
            <div className="code-card__bar">
              <span>work-price.ts</span>
              <span className="status-chip">{WORK_SUITE_VERSION}</span>
            </div>
            <pre>
              <span className="tok-key">$ / M ET</span>
              {"  = $ billed / work MU × 1e6\n"}
              <span className="tok-key">Work MU</span>
              {"    = official job chars / 4\n"}
              <span className="tok-key">Rank</span>
              {"       only if every task passed\n"}
              {"               retries stay in $ billed"}
            </pre>
          </aside>
        ) : (
          <aside className="code-card" aria-label="How to evaluate" data-hero-item>
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

      <section className="wrap section" id={hasEt ? "index" : "stacks"}>
        <h2 className="section__title">
          {hasEt ? "Cheapest to finish the work" : "Published stacks"}
        </h2>
        <p className="section__lede">
          {hasEt ? (
            <>
              Sorted by $ / M ET on {WORK_SUITE_VERSION} when every official
              task passed. $ / pass and tokens / pass keep the job-level
              breakdown, including retries. Burn vs leanest is only among
              complete finishes. Encoding is why two stickers are not
              comparable.
            </>
          ) : (
            <>
              Published stacks on {WORK_SUITE_VERSION}. Incomplete runs stay
              labeled. Run an eval to add coverage.
            </>
          )}
        </p>
        <IndexTable rows={rows} />
      </section>

      {hasEt ? (
        <section className="band">
          <div className="wrap band__grid">
            <div>
              <h2 className="section__title">One sticker, after the work</h2>
              <p>
                $ / M ET is the familiar unit after fertility, thinking, and
                retries. $ / pass is the bill for a finished job. Tokens / pass
                is whether the model is a burner. A 1/5 run cannot beat a 5/5
                finish. See{" "}
                <Link href="/methodology">Method</Link>.
              </p>
            </div>
            <ol>
              <li>Run the same suite. Retry until pass or the attempt budget.</li>
              <li>Every token stays in the bill, including failed attempts.</li>
              <li>$ / M ET is defined only when every official task passed.</li>
              <li>Encoding fertility explains the tokenizer, not the job.</li>
            </ol>
          </div>
        </section>
      ) : null}
    </>
  );
}
