import { createHash } from "node:crypto";
import { normalizeText } from "@/features/pricing/math";

export const EVAL_FORMAT = "metered-eval/1";
export const EVALUATOR_VERSION = "0.2.0";

export function sha256Utf8(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function contentHash(text: string): string {
  return sha256Utf8(normalizeText(text));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function integrityOf(value: unknown): string {
  return sha256Utf8(stableStringify(value));
}
