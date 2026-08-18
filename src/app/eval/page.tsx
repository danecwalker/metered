import type { Metadata } from "next";
import Link from "next/link";
import { EVALUATOR_VERSION } from "@/features/eval/hash";
import { lockfileOf } from "@/features/eval/package";
import { evalBootstrap } from "@/features/eval/source";
import { loadOfficialSuite } from "@/features/eval/suite";
import { currentUser } from "@/features/account/auth";
import { SubmitPackageForm } from "./eval-forms";

export const metadata: Metadata = {
  title: "Eval",
  description:
    "Upload a sealed package from a local run, or generate one with the two-step CLI.",
};

export default async function EvalPage() {
  const suite = await loadOfficialSuite();
  const lock = lockfileOf(suite);
  const boot = evalBootstrap();
  const user = await currentUser();

  return (
    <article className="wrap section grid gap-12">
      <header className="grid gap-3">
        <h1 className="section__title">Eval</h1>
        <p className="text-ink-2 max-w-[62ch] text-[length:var(--text-base)] leading-relaxed">
          Upload a sealed <code>metered-eval/1</code> package from the official
          suite repo. Anyone can read how. Only signed-in users can upload.
          Nothing posts until an admin screens it.
        </p>
      </header>

      {user && user.status === "active" ? (
        <SubmitPackageForm />
      ) : (
        <p className="banner" role="status">
          <strong>Sign in to upload.</strong>{" "}
          <Link href="/login?next=/eval">Sign in</Link>
          {" / "}
          <Link href="/signup?next=/eval">Create an account</Link>
        </p>
      )}

      <section className="grid gap-6">
        <header className="grid gap-3">
          <h2 className="section__title">How to eval</h2>
          <p className="text-ink-2 max-w-[62ch] text-[length:var(--text-base)] leading-relaxed">
            Clone the suite. Edit only <code>main.py</code> so it calls your
            harness: model, effort, dangerous mode, whatever that CLI needs.
            Then run. Docker is required: the agent works in an isolated
            checkout and the hidden verifier grades a git patch with no
            network. Do not edit <code>tasks/</code>.
          </p>
        </header>
        <div className="grid gap-5">
          <div className="code-card">
            <div className="code-card__bar">
              <span>1. clone and edit main.py</span>
              <span className="status-chip">
                {suite.suiteVersion} / {EVALUATOR_VERSION}
              </span>
            </div>
            <pre>{boot.initBlock}</pre>
          </div>
          <div className="code-card">
            <div className="code-card__bar">
              <span>2. run</span>
              <span className="status-chip">sealed package</span>
            </div>
            <pre>{boot.runBlock}</pre>
          </div>
        </div>
        <p className="text-muted text-xs leading-relaxed">
          {suite.tasks.length} official job{suite.tasks.length === 1 ? "" : "s"},
          hash {suite.suiteHash.slice(0, 16)}… /{" "}
          <Link href="/eval/suite">/eval/suite</Link>
          <br />
          Official suite {suite.suiteVersion}. Set HARNESS, MODEL, EFFORT, and
          FLAGS in main.py. The suite adapter for that CLI counts tokens and
          writes usage.json. Same SKU, different effort or harness, different
          row. High reputation can file a SKU that is not on the catalog yet.
        </p>
      </section>

      <script
        type="application/json"
        id="suite-lock"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lock) }}
      />
    </article>
  );
}
