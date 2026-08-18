export type HarnessKind = "api" | "product" | "agent";

export type HarnessDef = {
  id: string;
  slug: string;
  name: string;
  kind: HarnessKind;
  blurb: string;
};

/**
 * How the weights are driven — not the weights themselves.
 * GPT-5.4 (ChatGPT) and GPT-5.4 (API) are different rows.
 * Claude Sonnet (Claude Code) is not the same as Claude Sonnet (API).
 */
export const HARNESSES: HarnessDef[] = [
  {
    id: "hrs_api",
    slug: "api",
    name: "API",
    kind: "api",
    blurb: "Bare chat completions. Any lab (OpenAI, Anthropic, xAI, Qwen) through a local key.",
  },
  {
    id: "hrs_chatgpt",
    slug: "chatgpt",
    name: "ChatGPT",
    kind: "product",
    blurb: "OpenAI Codex CLI (`codex exec --json`). Signed in as ChatGPT. Not the raw API.",
  },
  {
    id: "hrs_claude",
    slug: "claude",
    name: "Claude Code",
    kind: "agent",
    blurb: "Anthropic’s Claude Code (`claude --print --output-format json`). Their agent loop, tools, and retries.",
  },
  {
    id: "hrs_deepseek",
    slug: "deepseek",
    name: "DeepSeek",
    kind: "agent",
    blurb: "DeepSeek / Deep Code CLI. The DeepSeek API is the API harness.",
  },
  {
    id: "hrs_gemini",
    slug: "gemini",
    name: "Gemini",
    kind: "product",
    blurb: "Google Gemini CLI (`gemini --output-format json`). The Gemini API is the API harness.",
  },
  {
    id: "hrs_grok",
    slug: "grok",
    name: "Grok",
    kind: "product",
    blurb: "xAI’s Grok Build CLI (`grok --single --output-format json`). The Grok API is the API harness.",
  },
  {
    id: "hrs_kimi",
    slug: "kimi",
    name: "Kimi",
    kind: "agent",
    blurb: "Moonshot Kimi Code (`kimi --prompt --output-format stream-json`).",
  },
  {
    id: "hrs_opencode",
    slug: "opencode",
    name: "OpenCode",
    kind: "agent",
    blurb: "OpenCode agent (`opencode run --format json`): repo tools, retries, and its system prompt.",
  },
  {
    id: "hrs_pi",
    slug: "pi",
    name: "Pi",
    kind: "agent",
    blurb: "Pi agent loop (`pi --mode json`), prompts, and tool policy.",
  },
  {
    id: "hrs_qwen",
    slug: "qwen",
    name: "Qwen",
    kind: "product",
    blurb: "Qwen Code (`qwen --output-format json`). DashScope API is the API harness.",
  },
  {
    id: "hrs_custom",
    slug: "custom",
    name: "Custom",
    kind: "agent",
    blurb: "Whatever you put in metered-eval.yaml. Name the stack in the package notes.",
  },
];

export function stackLabel(modelName: string, harnessName: string | null): string {
  if (!harnessName) return modelName;
  return `${modelName} (${harnessName})`;
}
