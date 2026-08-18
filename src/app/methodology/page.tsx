import type { Metadata } from "next";
import { SLICES } from "@/features/basket/slices";
import lock from "@/features/eval/official-lock.json";
import { REPUTATION_AUTO_PUBLISH } from "@/features/account/reputation";
import {
  BASKET_VERSION,
  CHARS_PER_MU,
  WORK_SUITE_VERSION,
} from "@/features/pricing/math";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How Metered ranks complete official work on $ / MU, and what each table column means.",
};

export default function MethodologyPage() {
  return (
    <article className="wrap section prose">
      <h1 className="section__title">How Metered compares models</h1>
      <p>
        Metered does not rank models on list price per 1,000,000 native tokens.
        Metered ranks stacks on the cost to finish the same official work. The
        rank uses $ / MU. A stack with a low list price can have a high $ / MU.
        The $ / MU is high if the stack uses more native tokens to finish the
        work.
      </p>

      <h2>What an MU is</h2>
      <p>
        1 MU is {CHARS_PER_MU} Unicode characters after NFC and LF. An MU is
        not a native token. Two models can read the same characters and use
        different token counts. The rank does not use the tokenizer. The rank
        uses one fixed quantity of official work.
      </p>
      <p>
        Official suite <code>{WORK_SUITE_VERSION}</code> is 3 Harbor coding
        jobs: a durable work queue, a rate limiter, and a JSON Patch subset.
        The agent does not see the hidden verifier. After the agent exits, we
        grade a git patch in a Docker container. That container has no
        network. This split is the same as DeepSWE.
      </p>
      <p>
        The suite is <strong>{lock.workMu} MU</strong>. That value is{" "}
        {lock.workChars} characters of fixed prompts and reference answers,
        divided by {CHARS_PER_MU}. The lock does not grow when a model writes
        more text. Fertility, thinking, retries, and failed attempts change
        only the bill.
      </p>

      <h2>The ranking: $ / MU</h2>
      <p>
        The rank value is $ billed divided by Work MU. This value is available
        only when a stack finishes every official task on{" "}
        <code>{WORK_SUITE_VERSION}</code>. A failed job is not cheaper than a
        complete finish. We divide $ billed by {lock.workMu}. We do not divide
        by 1,000,000 tokens. We do not divide by 1,000,000 MU.
      </p>
      <pre>
        {`1 MU        = ${CHARS_PER_MU} Unicode characters (NFC, LF)
Work MU     = ${lock.workChars} / ${CHARS_PER_MU} = ${lock.workMu}   (${WORK_SUITE_VERSION})
$ billed    = uncached_in × P_in
            + cache_write × P_write
            + cache_hit   × P_hit
            + billed_out  × P_out
$ / MU      = $ billed / ${lock.workMu}
$ / pass    = $ billed / tasks that passed
Tokens/pass = (uncached_in + billed_out) / passed`}
      </pre>
      <p>
        A complete finish that costs $1 gives a $ / MU of 1 / {lock.workMu}. Do
        not change the suite size to 1,000,000 units. $ / MU is the cost after
        the work. $ / MU is not a list price per 1,000,000 tokens.
      </p>
      <p>
        Token counts come from the suite adapter for that harness. Examples
        are the Claude JSON result, Codex <code>turn.completed</code>, Gemini
        session stats, and OpenCode <code>step_finish</code>. The runner writes{" "}
        <code>usage.json</code>. Uncached input, cache writes, cache reads,
        visible output, and thinking all enter the bill. Thinking that is
        already inside output is not added again. A complete finish with no
        counted tokens is not $0 / MU. That finish has no bill. That finish
        does not rank.
      </p>
      <p>
        $ / pass and Tokens / pass stay on the row. These values show the cost
        and the token count for the job. Burn vs leanest compares Tokens / pass
        to the lowest Tokens / pass among complete stacks. We bill thinking
        tokens at the output rate.
      </p>
      <p>
        Each Effort value is a separate row. Do not average Effort values. A
        row with high Effort is not the same as a row with default Effort.
      </p>

      <h2>Why a partial pass does not rank</h2>
      <p>
        The suite can have more than one official task. Do not sort on $ /
        pass after a short suite. A stack that finishes only a short task can
        then rank first. That rank is wrong. We show the pass count on every
        row. We give $ / MU and a sort key only to a complete finish.
      </p>
      <p>
        The local runner retries each task until the task passes, or until the
        attempt count reaches <code>MAX_ATTEMPTS</code>. If{" "}
        <code>MAX_ATTEMPTS</code> is 0, the runner does not stop on attempt
        count. The runner continues until the task passes. Every attempt stays
        in the bill. That bill is the cost to correct the work.
      </p>

      <h2>Token efficiency</h2>
      <p>
        Tokens / pass is <code>(input + output + thinking) / passed</code> on
        the same suite. Failed attempts stay in the token count. 1.00× burn is
        the complete stack with the lowest Tokens / pass. 5.50× means the stack
        used 5.50 times as many tokens to finish the jobs.
      </p>
      <p>
        This number includes the tokenizer. You do not need a second token
        value to see extra token use.
      </p>

      <h2>Encoding fertility</h2>
      <p>
        Fertility is a check on encoding. Fertility is not the sort key. Ahia
        et al. (EMNLP 2023) show that the same text gives a different API bill
        under different tokenizers. The TensorZero (2026) study finds 2.65
        times more native tokens on tool schemas for Claude Opus 4.7 than for
        GPT-5.4. In that study, a 2 times list-price difference is a 5.3 times
        input bill.
      </p>
      <p>
        If two models read the same characters, each model can use a different
        number of native tokens.
      </p>
      <pre>
        {`1 MU = ${CHARS_PER_MU} Unicode characters (NFC, LF)
Fertility = nativeTokens / MU
TruePrice = ListPrice × Fertility`}
      </pre>
      <p>
        Basket <code>{BASKET_VERSION}</code> has 6 slices:
      </p>
      <ul>
        {SLICES.map((slice) => (
          <li key={slice.id}>
            <strong>{slice.label}</strong> ({Math.round(slice.weight * 100)}
            %): {sliceWhy(slice.id)}
          </li>
        ))}
      </ul>
      <p>
        We count with official tables when we have them (
        <code>o200k_base</code>, <code>cl100k_base</code>). If we do not have
        a table, we use a lab count API or a pasted native count. Estimates
        have a label.
      </p>

      <h2>What a row is</h2>
      <p>
        A row is one model, one harness, and one endpoint. The model is the
        weights. The harness is the program that runs the model. The endpoint
        is the service that you pay. GPT with ChatGPT, GPT with OpenCode, and
        GPT with the API are 3 evals. The same harness on OpenRouter and on
        the lab endpoint can give 2 bills for the same token use.
      </p>

      <h2>What each column means</h2>
      <p>
        The Stacks table uses the columns below. Some columns show only on the
        full Stacks page.
      </p>

      <h3>Stack</h3>
      <p>
        Stack is the published name of the row. On the home table, the name
        includes the model, the lab, the harness, the Effort, and the
        endpoint. On the full Stacks table, the first column shows the model
        name and the SKU.
      </p>

      <h3>Lab</h3>
      <p>Lab is the organization that makes the model.</p>

      <h3>Harness</h3>
      <p>
        Harness is the CLI or agent program that runs the official job.
        Examples are Claude, Codex, Gemini, Grok, Qwen, Kimi, DeepSeek,
        OpenCode, and Pi. The same model with a different harness is a
        different row.
      </p>

      <h3>Effort</h3>
      <p>
        Effort is the thinking or reasoning setting that the harness used.
        Examples are none, low, medium, high, xhigh, and max. Each Effort
        value is a separate row. Do not average two Effort values.
      </p>

      <h3>Endpoint</h3>
      <p>
        Endpoint is the service that billed the tokens. The same model and
        harness on two endpoints can have two bills. List prices and lab
        identity come from{" "}
        <a href="https://models.dev">models.dev</a>. A Qwen Code run maps
        to Alibaba through an admin alias. Logos are the models.dev lab and
        provider marks.
      </p>

      <h3>Passed</h3>
      <p>
        Passed shows two numbers: tasks that passed, and official tasks. The
        value uses the form passed / tasks. 1/1 means the stack finished the
        one official job. 0/1 means the stack did not finish the official job.
      </p>

      <h3>Attempts</h3>
      <p>
        Attempts is the number of harness calls on that run, including
        retries after a failed hidden verifier. 1 means the job passed on
        the first call.
      </p>

      <h3>Time</h3>
      <p>
        Time is wall clock from the sealed package: finishedAt minus
        startedAt. It is the time the harness spent on the official jobs,
        not the time since the row was published.
      </p>

      <h3>Status</h3>
      <p>Status has 3 values:</p>
      <ul>
        <li>
          <strong>complete</strong>: the stack passed every official task.
        </li>
        <li>
          <strong>incomplete</strong>: the stack has an official run, but the
          run did not pass every task.
        </li>
        <li>
          <strong>no official run</strong>: the stack has no published official
          run.
        </li>
      </ul>
      <p>Only complete rows can have $ / MU.</p>

      <h3>$ / MU</h3>
      <p>
        $ / MU is $ billed divided by Work MU. Work MU for this suite is{" "}
        {lock.workMu}. This value is available only for a complete finish that
        has a token bill. A complete finish with 0 counted tokens does not
        rank.
      </p>

      <h3>$ / pass</h3>
      <p>
        $ / pass is $ billed divided by the number of tasks that passed.
        Failed attempts stay in $ billed. An incomplete run can have $ / pass
        if at least 1 task passed. This value is not the sort key.
      </p>

      <h3>Tokens / pass</h3>
      <p>
        Tokens / pass is (input + output + thinking) / passed. Failed attempts
        stay in the token count. Cache tokens that count as input stay in the
        input count. This value shows the number of native tokens the stack
        used per passed task.
      </p>

      <h3>Burn vs leanest</h3>
      <p>
        Burn vs leanest is Tokens / pass for this row, divided by the lowest
        Tokens / pass among complete rows. The leanest stack is the complete
        stack with the lowest Tokens / pass. 1.00× means this row used the
        same number of tokens as the leanest complete stack. 2.00× means this
        row used 2 times as many tokens to finish the same official work. A
        row that is not complete has no Burn vs leanest.
      </p>

      <h3>Encoding</h3>
      <p>
        Encoding is fertility on the text basket. Fertility is native tokens /
        MU for the same characters. A value of 1.00 is 4 characters per native
        token. A higher value means the tokenizer uses more native tokens for
        the same text. Encoding does not change the rank.
      </p>

      <h3>Sticker in</h3>
      <p>
        Sticker in is the list price for 1,000,000 input tokens on that
        endpoint. This is the published rate. This is not $ / MU.
      </p>

      <h3>Sticker out</h3>
      <p>
        Sticker out is the list price for 1,000,000 output tokens on that
        endpoint. We bill thinking tokens at this rate. The full Stacks table
        shows this column.
      </p>

      <h2>How an eval is run</h2>
      <ol>
        <li>
          Freeze the suite in its own repo (
          <code>{WORK_SUITE_VERSION}</code>). Hash the instruction and the
          expected answers. Do not hash the CLI flags.
        </li>
        <li>
          Clone that repo. Run{" "}
          <code>python3 -m metered_suite init</code>
          . That command writes <code>harness.yaml</code> from the CLIs on PATH.
          A run will not start without that file. Then run{" "}
          <code>python3 -m metered_suite &lt;harness&gt; --model … --effort …</code>
          . The harness name must be a key in <code>harness.yaml</code>. Set the
          harness, the model, and the Effort. Approve flags live in that file.
        </li>
        <li>
          The runner seeds a Docker agent workspace with only the official
          repo. Hidden tests stay out of the workspace.
          After the harness exits, collect a git patch. Grade the patch in a
          new container with no network. This split is the same as DeepSWE.
          Retry each failed patch until the task passes or until{" "}
          <code>MAX_ATTEMPTS</code>.
        </li>
        <li>
          After the CLI exits, the suite harvests token counts from stdout,
          stderr, <code>usage.json</code>, and session files. Keep input, output,
          thinking, and cache from every attempt in the bill. If there are no
          tokens, there is no $ / MU.
        </li>
        <li>
          The package includes hashes of the jobs, the answers, and the
          totals.
          Upload the package at <a href="/eval">/eval</a>. Edited totals fail
          verification. Swapped prompts fail verification. A changed pass flag
          fails verification.
        </li>
      </ol>
      <p>
        Suite-verified does not mean the API bill is correct. Suite-verified
        means the package is a complete sealed run of our jobs. The totals match the
        jobs and the answers on the fixed prompts. A user with reputation{" "}
        {REPUTATION_AUTO_PUBLISH} and no prior rejects publishes to Stacks on
        submit. Other accounts wait for an admin. One harness for every model
        removes one difference.
        Several harnesses for one model are valid if each harness has a name.
      </p>

      <h2>What we do not include</h2>
      <ul>
        <li>
          A 7:2:1 cache blend that we did not measure on your usage.
        </li>
        <li>
          Intelligence scores. Pass or fail is a test that we can check. Pass
          or fail is not an intelligence score.
        </li>
        <li>Images, audio, and video. Those types use different meters.</li>
      </ul>
      <p>
        Encoding fertility counts the same text with each tokenizer.
        That value is encoding. That value is not a job.
      </p>
    </article>
  );
}

function sliceWhy(id: string): string {
  switch (id) {
    case "english":
      return "Default product text, documents, and essays.";
    case "code":
      return "This slice is source code. Most production token use is source code.";
    case "structured":
      return "JSON, YAML, and wire formats.";
    case "tools":
      return "Function-call payloads. Fertility is often higher on this slice.";
    case "cjk":
      return "Chinese, Japanese, and Korean text. Many English tokenizers use more tokens on this slice.";
    case "instructions":
      return "System prompts and product instructions.";
    default:
      return "";
  }
}
