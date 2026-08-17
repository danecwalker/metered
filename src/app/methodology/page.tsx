import type { Metadata } from "next";
import Link from "next/link";
import { SLICES } from "@/features/basket/slices";
import {
  BASKET_VERSION,
  CHARS_PER_MU,
  WORK_SUITE_VERSION,
} from "@/features/pricing/math";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How Metered ranks finished work on $ / million effective tokens, and why a partial pass is not cheap.",
};

export default function MethodologyPage() {
  return (
    <article className="wrap section prose">
      <h1>How we compare models</h1>
      <p>
        The useful question is not “who printed the lowest $/1M tokens.” It is
        who is cheapest to <em>finish the same work</em>, and who wastes tokens
        getting there. A model can look 10× cheaper on the sticker and still
        lose, if it thinks longer or encodes the same prompt into more native
        tokens.
      </p>

      <h2>The ranking: $ / million effective tokens</h2>
      <p>
        The headline number is the familiar unit — dollars per million tokens —
        after the work is done. It is only defined when a stack finishes{" "}
        <em>every</em> official task on <code>{WORK_SUITE_VERSION}</code>.
        A 1/5 run is not cheaper than a 5/5 finish.
      </p>
      <pre>
        {`Work MU     = characters of the official jobs / ${CHARS_PER_MU}
              (frozen prompts + reference answers)
$ billed    = uncached_in × P_in
            + cache_hit   × P_cache
            + (out + think) × P_out
$ / M ET    = $ billed / Work MU × 1e6
$ / pass    = $ billed / tasks that passed
Tokens/pass = (in + out + think) / passed`}
      </pre>
      <p>
        Effective tokens are <em>not</em> native tokens. They are Metered
        Units of the official jobs — a tokenizer-independent volume of
        finished work. Fertility, thinking, retries, and failed attempts
        all raise the bill, so they raise $ / M ET. That is the sticker
        after the work.
      </p>
      <p>
        $ / pass and tokens / pass stay on the row so you can see the job.
        Burn vs leanest is tokens/pass versus the stingiest{" "}
        <em>complete</em> stack. Thinking is billed at the output rate.
        Effort — none, low, medium, high, xhigh, max — is a separate row,
        never averaged. GPT-high is not GPT-default.
      </p>

      <h2>Why a partial pass does not rank</h2>
      <p>
        If we sorted on $ / pass after a one-shot suite, a stack that only
        finished the short chat task would beat one that finished the whole
        set. SWE-bench and Artificial Analysis keep coverage and cost as
        two axes for that reason. We keep pass rate visible, and we only
        hand a $ / M ET — and a sort key — to a complete finish.
      </p>
      <p>
        The local runner retries each task until it passes or hits the
        attempt budget in <code>metered-eval.yaml</code>. Every attempt
        stays in the bill. That is the cost of correcting itself.
      </p>

      <h2>Token efficiency</h2>
      <p>
        Tokens per pass is{" "}
        <code>(input + output + thinking) / passed</code> on that same
        suite. Failed attempts stay in the numerator. 1.00× burn is the
        stingiest complete stack. 5.50× means it burned five and a half
        times as many tokens to finish the jobs.
      </p>
      <p>
        That number already includes the tokenizer. You do not need a
        separate “true token” to see a burner.
      </p>

      <h2>Encoding fertility (why stickers lie)</h2>
      <p>
        Fertility is a diagnostic, not the sort. Ahia et al. (EMNLP 2023)
        showed that the same text is a different API bill under different
        tokenizers. TensorZero (2026) measured 2.65× more native tokens on
        tool schemas for Claude Opus 4.7 than GPT-5.4 — a 2× sticker that
        became a 5.3× input bill. We ask the same question: if both models
        read the <em>same characters</em>, how many native tokens is that?
      </p>
      <pre>
        {`1 MU = ${CHARS_PER_MU} Unicode characters (NFC, LF)
Fertility = nativeTokens / MU
TruePrice = ListPrice × Fertility`}
      </pre>
      <p>
        Basket <code>{BASKET_VERSION}</code>:
      </p>
      <ul>
        {SLICES.map((slice) => (
          <li key={slice.id}>
            <strong>{slice.label}</strong> ({Math.round(slice.weight * 100)}%) —{" "}
            {slice.why}
          </li>
        ))}
      </ul>
      <p>
        Counted with official tables when we have them (
        <code>o200k_base</code>, <code>cl100k_base</code>), otherwise a lab
        count API or a pasted native count. Estimates are labeled.
      </p>

      <h2>What a row is</h2>
      <p>
        A row is <strong>model × harness × endpoint</strong>. The model is the
        weights. The harness is how you drive them. The endpoint is who you
        pay. GPT (ChatGPT), GPT (Pi), and GPT (OpenCode) are three evals.
        OpenRouter vs first-party on the same harness is two bills for one
        token burn.
      </p>

      <h2>How an eval is run</h2>
      <ol>
        <li>Freeze the suite (<code>{WORK_SUITE_VERSION}</code> / scenario files).</li>
        <li>
          Pick the stack: model + harness + provider. Claude the weights are
          not Claude Code. Qwen the API is not the Qwen app. How the harness
          is invoked lives in <code>metered-eval.yaml</code>, not in our
          source.
        </li>
        <li>
          Run each task the way that harness runs it. If the check fails,
          retry with the previous answer attached, up to{" "}
          <code>max_attempts</code>.
        </li>
        <li>
          Record whatever that harness bills across every attempt: input,
          output, thinking, cache, extra tool turns. If the product does not
          expose tokens, the row cannot be official.
        </li>
        <li>
          Score pass/fail with the suite’s check — required phrases, or JSON
          keys and values against the gold extract. <code>nonempty</code> is
          not enough.
        </li>
        <li>
          On your machine, put the command in <code>metered-eval.yaml</code>{" "}
          and run <code>npx tsx cli/metered-eval.ts run --harness …</code>.
          Upload the sealed package at <a href="/eval">/eval</a>. Edited
          totals or swapped prompts fail verification.
        </li>
      </ol>
      <p>
        Suite-verified is not the same as “the API bill was honest.” It means
        this is a complete sealed run of our jobs, internally consistent, on
        the frozen prompts. An admin still publishes to the index. Using one
        harness for every model removes a variable. Several harnesses for one
        model are valid if they are named.
      </p>

      <h2>What we still do not mix in</h2>
      <ul>
        <li>A 7:2:1 cache blend we did not measure on your traffic.</li>
        <li>Intelligence scores. Pass/fail is a checkable rubric, not an IQ.</li>
        <li>Images, audio, video — different meters.</li>
      </ul>
      <p>
        <Link href="/compare">Paste text</Link> still prices a string through
        each tokenizer. That is encoding, not a job.
      </p>
    </article>
  );
}
