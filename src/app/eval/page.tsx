import type { Metadata } from "next";
import Link from "next/link";
import { EVALUATOR_VERSION } from "@/features/eval/hash";
import { lockfileOf } from "@/features/eval/package";
import { evalBootstrap } from "@/features/eval/source";
import { loadOfficialSuite } from "@/features/eval/suite";
import { SubmitPackageForm } from "./eval-forms";

export const metadata: Metadata = {
  title: "Eval",
  description:
    "Run the official suite on your machine via a YAML-configured command, then submit the sealed package.",
};

export default async function EvalPage() {
  const suite = await loadOfficialSuite();
  const lock = lockfileOf(suite);
  const boot = evalBootstrap();

  return (
    <article className="wrap section">
      <h1 className="section__title">Eval on your machine</h1>
      <p className="section__lede">
        Two commands. The first writes <code>metered-eval.yaml</code> from
        the CLIs on your machine. The second runs the official suite — retry
        until pass or <code>max_attempts</code> — and seals a package. Keys
        never leave this machine. $ / M ET is only published for a complete
        finish.
      </p>

      <div className="code-card" style={{ marginBottom: "1rem" }}>
        <div className="code-card__bar">
          <span>1 · generate yaml</span>
          <span className="status-chip">
            {suite.suiteVersion} · {EVALUATOR_VERSION}
          </span>
        </div>
        <pre>{boot.initBlock}</pre>
      </div>

      <div className="code-card" style={{ marginBottom: "2rem" }}>
        <div className="code-card__bar">
          <span>2 · run the suite</span>
          <span className="status-chip">sealed package</span>
        </div>
        <pre>{boot.runBlock}</pre>
      </div>

      <p className="model-meta" style={{ marginBottom: "2rem" }}>
        {suite.tasks.length} official tasks · hash {suite.suiteHash.slice(0, 16)}… ·{" "}
        <Link href="/eval/suite">/eval/suite</Link>
        <br />
        Placeholders: <code>{"{prompt}"}</code>, <code>{"{prompt_file}"}</code>,{" "}
        <code>{"{model}"}</code>, <code>{"{task_id}"}</code>,{" "}
        <code>{"{effort}"}</code>. Pass <code>--effort high</code> (or none /
        low / medium / xhigh / max). Same model, different effort, different
        row.
      </p>

      <h2 className="section__title">Submit a sealed package</h2>
      <SubmitPackageForm />

      <script
        type="application/json"
        id="suite-lock"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lock) }}
      />
    </article>
  );
}
