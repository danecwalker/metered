import type { Metadata } from "next";
import { SLICES } from "@/features/basket/slices";
import lock from "@/features/eval/official-lock.json";
import {
  BASKET_VERSION,
  CHARS_PER_MU,
  WORK_SUITE_VERSION,
} from "@/features/pricing/math";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How Metered ranks finished work on $ / MU, what an MU is, and why a partial pass is not cheap.",
};

export default function MethodologyPage() {
  return (
    <article className="wrap section prose">
      <h1 className="section__title">How we compare models</h1>
      <p>
        The useful question is not “who printed the lowest $/1M tokens.” It is
        who is cheapest to <em>finish the same work</em>, and who wastes tokens
        getting there. A model can look 10× cheaper on the sticker and still
        lose, if it thinks longer or encodes the same prompt into more native
        tokens.
      </p>

      <h2>What an MU is</h2>
      <p>
        1 MU is {CHARS_PER_MU} Unicode characters after NFC and LF. It is{" "}
        <em>not</em> a native token. Two models can read the same characters
        and spend different token counts. The rank ignores the tokenizer and
        uses one fixed volume of official work.
      </p>
      <p>
        Official suite <code>{WORK_SUITE_VERSION}</code> is one Harbor-style
        coding job (a durable work queue). The agent never sees the hidden
        verifier. After it exits we grade a git patch in a no-network Docker
        container, the same split DeepSWE uses. The suite is{" "}
        <strong>{lock.workMu} MU</strong>: {lock.workChars} characters of
        frozen prompts and reference answers, divided by {CHARS_PER_MU}. That
        lock does not grow when a model is verbose. Fertility, thinking,
        retries, and failed attempts only change the bill.
      </p>

      <h2>The ranking: $ / MU</h2>
      <p>
        The headline is <code>$ billed / Work MU</code>. It is only defined
        when a stack finishes <em>every</em> official task on{" "}
        <code>{WORK_SUITE_VERSION}</code>. A failed job is not cheaper than a
        finish. The denominator is {lock.workMu}, not a million tokens
        and not a million MU.
      </p>
      <pre>
        {`1 MU        = ${CHARS_PER_MU} Unicode characters (NFC, LF)
Work MU     = ${lock.workChars} / ${CHARS_PER_MU} = ${lock.workMu}   (${WORK_SUITE_VERSION})
$ billed    = uncached_in × P_in
            + cache_hit   × P_cache
            + (out + think) × P_out
$ / MU      = $ billed / ${lock.workMu}
$ / pass    = $ billed / tasks that passed
Tokens/pass = (in + out + think) / passed`}
      </pre>
      <p>
        A $1 complete finish is $1 / {lock.workMu}, about $0.002 / MU. Do
        not scale the suite to a million units. That is the sticker after
        the work, not a list $/1M token price.
      </p>
      <p>
        Token counts come from the suite adapter for that harness: Claude's
        JSON result, Codex <code>turn.completed</code>, Gemini session stats,
        OpenCode <code>step_finish</code>, and so on. The runner writes{" "}
        <code>usage.json</code> itself. A complete finish with no counted
        tokens is not $0 / MU; it simply has no bill, so it does not rank.
      </p>
      <p>
        $ / pass and tokens / pass stay on the row so you can see the job.
        Burn vs leanest is tokens/pass versus the stingiest{" "}
        <em>complete</em> stack. Thinking is billed at the output rate.
        Effort (none, low, medium, high, xhigh, max) is a separate row,
        never averaged. GPT-high is not GPT-default.
      </p>

      <h2>Why a partial pass does not rank</h2>
      <p>
        If we sorted on $ / pass after a one-shot suite, a stack that only
        finished the short chat task would beat one that finished the whole
        set. SWE-bench and Artificial Analysis keep coverage and cost as
        two axes for that reason. We keep pass rate visible, and we only
        hand a $ / MU, and a sort key, to a complete finish.
      </p>
      <p>
        The local runner retries each task until it passes or hits{" "}
        <code>MAX_ATTEMPTS</code>. Every attempt stays in the bill. That is
        the cost of correcting itself.
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
        tool schemas for Claude Opus 4.7 than GPT-5.4. A 2× sticker that
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
            <strong>{slice.label}</strong> ({Math.round(slice.weight * 100)}%):{" "}
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
        pay. GPT (ChatGPT), GPT (OpenCode), and GPT (API) are three evals.
        OpenRouter vs first-party on the same harness is two bills for one
        token burn.
      </p>

      <h2>How an eval is run</h2>
      <ol>
        <li>
          Freeze the suite in its own repo (
          <code>{WORK_SUITE_VERSION}</code>). Instruction + expected answers
          are hashed. <code>main.py</code> is not.
        </li>
        <li>
          Clone that repo. Edit only <code>main.py</code> so it calls your
          harness (Claude, Codex, Gemini, Grok, Qwen, Kimi, DeepSeek,
          OpenCode, Pi) plus model, effort, and extra flags.
        </li>
        <li>
          The runner seeds a Docker agent workspace (the official repo only).
          Hidden tests stay out. After the harness exits we collect a git
          patch and grade it in a fresh container with no network, the same
          split DeepSWE uses. Failed patches retry up to{" "}
          <code>MAX_ATTEMPTS</code>.
        </li>
        <li>
          The harness adapter runs that CLI, parses its usage JSON, and
          writes <code>usage.json</code>. Input, output, thinking, and cache
          across every attempt stay in the bill. No tokens means no $ / MU.
        </li>
        <li>
          The sealed package hashes the jobs, the answers, and the totals.
          Upload it at <a href="/eval">/eval</a>. Edited totals, swapped
          prompts, or a flipped pass flag fail verification.
        </li>
      </ol>
      <p>
        Suite-verified is not the same as “the API bill was honest.” It means
        this is a complete sealed run of our jobs, internally consistent, on
        the frozen prompts. An admin still publishes to Stacks. Using one
        harness for every model removes a variable. Several harnesses for one
        model are valid if they are named.
      </p>

      <h2>What we still do not mix in</h2>
      <ul>
        <li>A 7:2:1 cache blend we did not measure on your traffic.</li>
        <li>Intelligence scores. Pass/fail is a checkable rubric, not an IQ.</li>
        <li>Images, audio, video: different meters.</li>
      </ul>
      <p>
        Encoding fertility still prices a string through each tokenizer. That
        is encoding, not a job.
      </p>
    </article>
  );
}
