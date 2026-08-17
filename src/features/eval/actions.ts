"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/auth";
import { slugify } from "@/features/admin/schemas";
import { ensureReady } from "@/db/client";
import { endpoints, harnesses, models, submissions, workRuns } from "@/db/schema";
import { parseEvalPackage } from "@/features/eval/package";
import { loadOfficialSuite } from "@/features/eval/suite";
import type { EvalPackage, VerifyResult } from "@/features/eval/types";
import { verifyPackage } from "@/features/eval/verify";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";

export type SubmitState = {
  error?: string;
  ok?: boolean;
  id?: string;
  verify?: VerifyResult;
};

const PROVIDER_KEY_FIELD = /^(api[_-]?key|authorization|.+_api_key)$/i;

function formHasProviderApiKey(formData: FormData): boolean {
  for (const key of formData.keys()) {
    if (PROVIDER_KEY_FIELD.test(key) && String(formData.get(key) ?? "").trim()) {
      return true;
    }
  }
  return false;
}

function valueHasProviderApiKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(valueHasProviderApiKey);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PROVIDER_KEY_FIELD.test(key)) return true;
    if (valueHasProviderApiKey(child)) return true;
  }
  return false;
}

export async function submitPackageAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  // Only package JSON + optional note. Provider keys stay on the local runner.
  if (formHasProviderApiKey(formData)) {
    return { error: "Do not send provider API keys. Run the eval on your machine." };
  }
  const raw = String(formData.get("package") ?? "").trim();
  if (!raw) return { error: "Paste or upload a sealed package." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "That file is not JSON." };
  }
  if (valueHasProviderApiKey(parsed)) {
    return { error: "Package must not include provider API keys." };
  }

  let pkg: EvalPackage;
  try {
    pkg = parseEvalPackage(parsed);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid package." };
  }

  const official = await loadOfficialSuite();
  const verify = verifyPackage(pkg, official);
  const db = await ensureReady();
  const [harness] = await db
    .select()
    .from(harnesses)
    .where(eq(harnesses.id, pkg.stack.harnessId))
    .limit(1);
  if (!harness || harness.slug !== pkg.stack.harnessSlug) {
    return { error: "Harness id and slug do not match a known harness." };
  }
  if (!verify.ok) {
    return {
      error: verify.issues.map((issue) => issue.message).join(" "),
      verify,
    };
  }

  const existing = await db
    .select()
    .from(submissions)
    .where(eq(submissions.integrity, pkg.integrity))
    .limit(1);
  if (existing[0]) {
    return { ok: true, id: existing[0].id, verify, error: "This exact package was already submitted." };
  }

  const id = crypto.randomUUID();
  await db.insert(submissions).values({
    id,
    status: "verified",
    integrity: pkg.integrity,
    suiteHash: pkg.suiteHash,
    modelName: pkg.stack.modelName,
    modelSlug: pkg.stack.modelSlug || slugify(pkg.stack.modelName),
    lab: pkg.stack.lab,
    harnessId: pkg.stack.harnessId,
    harnessSlug: pkg.stack.harnessSlug,
    provider: pkg.stack.provider,
    sku: pkg.stack.sku,
    setting: pkg.stack.setting,
    tasks: pkg.totals.tasks,
    passed: pkg.totals.passed,
    inputTokens: pkg.totals.input,
    outputTokens: pkg.totals.output,
    reasoningTokens: pkg.totals.reasoning,
    cacheHitTokens: pkg.totals.cacheHit,
    packageJson: JSON.stringify(pkg),
    note: String(formData.get("note") ?? "").trim() || null,
    reviewNote: null,
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/admin/submissions");
  revalidatePath("/eval");
  return { ok: true, id, verify };
}

export async function listSubmissions() {
  await requireAdmin();
  const db = await ensureReady();
  return db.select().from(submissions).orderBy(desc(submissions.createdAt));
}

export async function publishSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row || row.status === "rejected") return;

  const pkg = parseEvalPackage(JSON.parse(row.packageJson));
  const now = new Date().toISOString();
  const slug = row.modelSlug;
  let [model] = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  if (!model) {
    const modelId = crypto.randomUUID();
    await db.insert(models).values({
      id: modelId,
      slug,
      name: row.modelName,
      lab: row.lab || "Unknown",
      tokenizerKey: "manual",
      status: "published",
      notes: `Published from community package ${row.integrity.slice(0, 12)}.`,
      createdAt: now,
      updatedAt: now,
    });
    [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  }
  if (!model) return;

  const eps = await db.select().from(endpoints).where(eq(endpoints.modelId, model.id));
  const match = eps.find((item) => item.sku === row.sku && item.provider === row.provider);
  if (!match) {
    await db.insert(endpoints).values({
      id: crypto.randomUUID(),
      modelId: model.id,
      provider: row.provider,
      sku: row.sku,
      displayName: `${row.provider} · ${row.harnessSlug}`,
      listInput: pkg.stack.listInput,
      listOutput: pkg.stack.listOutput,
      listCacheHit: null,
      listCacheWrite: null,
      contextNote: "From a suite-verified community package.",
      status: "published",
      sortOrder: 0,
    });
  }

  await db
    .insert(workRuns)
    .values({
      id: crypto.randomUUID(),
      modelId: model.id,
      harnessId: row.harnessId,
      suiteVersion: WORK_SUITE_VERSION,
      setting: row.setting,
      tasks: row.tasks,
      passed: row.passed,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      reasoningTokens: row.reasoningTokens,
      cacheHitTokens: row.cacheHitTokens,
      source: "official",
      notes: `Community package ${row.integrity}`,
      measuredAt: now,
    })
    .onConflictDoUpdate({
      target: [workRuns.modelId, workRuns.harnessId, workRuns.suiteVersion, workRuns.setting],
      set: {
        tasks: row.tasks,
        passed: row.passed,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        reasoningTokens: row.reasoningTokens,
        cacheHitTokens: row.cacheHitTokens,
        source: "official",
        notes: `Community package ${row.integrity}`,
        measuredAt: now,
      },
    });

  await db
    .update(submissions)
    .set({ status: "published", reviewNote: "Published to the index." })
    .where(eq(submissions.id, id));

  revalidatePath("/");
  revalidatePath(`/models/${slug}`);
  revalidatePath("/admin/submissions");
}

export async function rejectSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  await db
    .update(submissions)
    .set({ status: "rejected", reviewNote: "Rejected." })
    .where(eq(submissions.id, id));
  revalidatePath("/admin/submissions");
}
