import type { EvalCheck } from "@/features/eval/types";

export type ScoreOptions = {
  expectedKeys?: string[];
  expectedJson?: Record<string, unknown>;
  mustInclude?: string[];
};

export function scoreOutput(
  check: EvalCheck,
  output: string,
  options: ScoreOptions = {},
): boolean {
  const text = output.trim();
  if (check === "nonempty") return text.length > 0;
  if (check === "contains") {
    if (!text) return false;
    const needles = options.mustInclude ?? [];
    if (needles.length === 0) return text.length > 0;
    const hay = text.toLowerCase();
    return needles.every((needle) => hay.includes(needle.toLowerCase()));
  }
  if (check !== "extract-json") return text.length > 0;

  const json = extractJsonObject(text);
  if (!json) return false;
  const keys = options.expectedKeys ?? Object.keys(options.expectedJson ?? {});
  if (!keys.every((key) => Object.hasOwn(json, key))) return false;
  if (!options.expectedJson) return true;
  return Object.entries(options.expectedJson).every(([key, expected]) =>
    valuesMatch(expected, json[key]),
  );
}

export function valuesMatch(expected: unknown, actual: unknown): boolean {
  if (expected === null) return actual === null;
  if (typeof expected === "number" && typeof actual === "number") {
    return Math.abs(expected - actual) <= 1e-6;
  }
  if (typeof expected === "string" && typeof actual === "string") {
    return expected.trim().toLowerCase() === actual.trim().toLowerCase();
  }
  return expected === actual;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}
