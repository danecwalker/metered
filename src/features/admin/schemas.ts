import { z } from "zod";
import { EFFORTS } from "@/features/eval/effort";

export const modelFormSchema = z.object({
  name: z.string().trim().min(1, "Name the model."),
  lab: z.string().trim().min(1, "Name the lab."),
  slug: z
    .string()
    .trim()
    .min(1, "Add a slug.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  tokenizerKey: z.enum(["o200k_base", "cl100k_base", "manual"]),
  status: z.enum(["draft", "published"]),
  notes: z.string().trim().optional(),
});

export const endpointFormSchema = z.object({
  provider: z.string().trim().min(1, "Name the provider."),
  sku: z.string().trim().min(1, "Add the SKU."),
  displayName: z.string().trim().min(1, "Add a display name."),
  listInput: z.coerce.number().positive("Input list price must be greater than zero."),
  listOutput: z.union([z.coerce.number().positive(), z.nan()]).optional(),
  listCacheHit: z.union([z.coerce.number().nonnegative(), z.nan()]).optional(),
  listCacheWrite: z.union([z.coerce.number().nonnegative(), z.nan()]).optional(),
  contextNote: z.string().trim().optional(),
  status: z.enum(["draft", "published"]),
});

export const workRunFormSchema = z.object({
  harnessId: z.string().min(1, "Pick a harness."),
  setting: z.enum(EFFORTS),
  tasks: z.coerce.number().int().positive("Need at least one task."),
  passed: z.union([z.coerce.number().int().nonnegative(), z.nan()]).optional(),
  inputTokens: z.coerce.number().int().nonnegative(),
  outputTokens: z.coerce.number().int().nonnegative(),
  reasoningTokens: z.coerce.number().int().nonnegative(),
  cacheHitTokens: z.coerce.number().int().nonnegative(),
  cacheWriteTokens: z.coerce.number().int().nonnegative(),
  attempts: z.union([z.coerce.number().int().positive(), z.nan()]).optional(),
  durationSec: z.union([z.coerce.number().int().nonnegative(), z.nan()]).optional(),
  notes: z.string().trim().optional(),
});

export const measurementFormSchema = z.object({
  sliceId: z.enum(["english", "code", "structured", "tools", "cjk", "instructions"]),
  nativeTokens: z.coerce.number().int().nonnegative("Token count cannot be negative."),
});

export const modelMetaSchema = z.object({
  labId: z.string().trim().min(1).optional(),
  tokenizerKey: z.enum(["o200k_base", "cl100k_base", "manual"]),
  status: z.enum(["draft", "published"]),
  notes: z.string().trim().optional(),
});

export const aliasFormSchema = z.object({
  kind: z.enum(["provider", "sku"]),
  source: z
    .string()
    .trim()
    .min(1, "Add the name the run uses.")
    .transform((value) => value.toLowerCase()),
  target: z.string().trim().min(1, "Add the models.dev id."),
  note: z.string().trim().optional(),
});

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function optionalNumber(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
