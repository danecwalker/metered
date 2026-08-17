export const EFFORTS = [
  "default",
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type Effort = (typeof EFFORTS)[number];

export function isEffort(value: string): value is Effort {
  return (EFFORTS as readonly string[]).includes(value);
}

export function parseEffort(value: string): Effort | null {
  const trimmed = value.trim().toLowerCase();
  if (isEffort(trimmed)) return trimmed;
  if (trimmed === "med") return "medium";
  if (trimmed === "x-high" || trimmed === "extra-high") return "xhigh";
  return null;
}

/** OpenAI / OpenRouter reasoning.effort. Omit when the harness default applies. */
export function apiReasoningEffort(effort: Effort): string | undefined {
  if (effort === "default") return undefined;
  if (effort === "max") return "xhigh";
  return effort;
}
