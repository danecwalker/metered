"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/auth";
import { requireUser } from "@/features/account/auth";
import {
  afterCorroborate,
  afterPublish,
  afterReject,
  shouldBan,
} from "@/features/account/reputation";
import { slugify } from "@/features/admin/schemas";
import { ensureReady } from "@/db/client";
import {
  endpoints,
  models,
  submissions,
  users,
  workRuns,
} from "@/db/schema";
import type { RunSample } from "@/features/eval/confidence";
import { harnessIdForSlug, identityError } from "@/features/eval/identity";
import { clockFromPackage, parseEvalPackage } from "@/features/eval/package";
import { screenSubmission, type ScreenReport } from "@/features/eval/screen";
import { loadOfficialSuite } from "@/features/eval/suite";
import type { EvalPackage, VerifyResult } from "@/features/eval/types";
import { verifyPackage } from "@/features/eval/verify";
import {
  detectFromRun,
  ensureCatalogIdentity,
  findLocalIdentity,
  listCatalogAliases,
} from "@/features/catalog/sync";
import { loadCatalog } from "@/features/catalog/models-dev";
import { detectProviderId, resolveCatalogModel } from "@/features/catalog/resolve";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";

export type SubmitState = {
  error?: string;
  ok?: boolean;
  id?: string;
  published?: boolean;
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

async function resolveRunIdentity(query: {
  sku: string;
  provider?: string;
  lab?: string;
  modelName?: string;
  harnessSlug?: string;
  baseUrl?: string;
}) {
  const db = await ensureReady();
  const match = await detectFromRun(db, query);
  const local = await findLocalIdentity(db, { sku: query.sku, match });
  return { match, local };
}

function hintsFromSubmission(row: {
  sku: string;
  provider: string;
  lab: string;
  modelName: string;
  harnessSlug: string;
  packageJson: string;
}) {
  let provider = row.provider;
  let baseUrl: string | undefined;
  try {
    const pkg = parseEvalPackage(JSON.parse(row.packageJson));
    baseUrl = pkg.stack.baseUrl;
    if (!provider || provider === "unlisted") {
      provider = pkg.stack.providerId || pkg.stack.provider || row.provider;
    }
  } catch {
    /* use the stored row */
  }
  return {
    sku: row.sku,
    provider,
    lab: row.lab,
    modelName: row.modelName,
    harnessSlug: row.harnessSlug,
    baseUrl,
  };
}

async function peerSamples(args: {
  suiteHash: string;
  harnessSlug: string;
  sku: string;
  setting: string;
}): Promise<RunSample[]> {
  const db = await ensureReady();
  const rows = await db
    .select({
      userId: submissions.userId,
      passed: submissions.passed,
      tasks: submissions.tasks,
      inputTokens: submissions.inputTokens,
      outputTokens: submissions.outputTokens,
      reasoningTokens: submissions.reasoningTokens,
      reputation: users.reputation,
    })
    .from(submissions)
    .leftJoin(users, eq(submissions.userId, users.id))
    .where(
      and(
        eq(submissions.suiteHash, args.suiteHash),
        eq(submissions.harnessSlug, args.harnessSlug),
        eq(submissions.sku, args.sku),
        eq(submissions.setting, args.setting),
        inArray(submissions.status, ["verified", "published"]),
      ),
    );
  return rows
    .filter((row) => row.userId)
    .map((row) => ({
      userId: row.userId as string,
      reputation: row.reputation ?? 0,
      passed: row.passed,
      tasks: row.tasks,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      reasoningTokens: row.reasoningTokens,
    }));
}

export async function submitPackageAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const user = await requireUser();
  if (user.status === "banned") {
    return { error: "This account is banned." };
  }
  if (formHasProviderApiKey(formData)) {
    return { error: "Do not send provider API keys. Run the eval on your machine." };
  }
  const raw = String(formData.get("package") ?? "").trim();
  if (!raw) return { error: "Upload a sealed package." };
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
  if (!verify.ok) {
    return {
      error: verify.issues.map((issue) => issue.message).join(" "),
      verify,
    };
  }

  const idError = identityError(pkg.stack.harnessSlug, pkg.stack.sku);
  if (idError) return { error: idError, verify };

  const harnessId = harnessIdForSlug(pkg.stack.harnessSlug);
  if (!harnessId) return { error: "Unknown harness." };

  const identity = await resolveRunIdentity({
    sku: pkg.stack.sku,
    provider: pkg.stack.providerId || pkg.stack.provider,
    lab: pkg.stack.lab,
    modelName: pkg.stack.modelName,
    harnessSlug: pkg.stack.harnessSlug,
    baseUrl: pkg.stack.baseUrl,
  });
  const catalogKnown = Boolean(identity.match) || Boolean(identity.local);
  const screen = screenSubmission({
    harnessSlug: pkg.stack.harnessSlug,
    sku: pkg.stack.sku,
    catalogKnown,
    user: {
      reputation: user.reputation,
      status: user.status,
      rejectCount: user.rejectCount,
    },
    peers: await peerSamples({
      suiteHash: pkg.suiteHash,
      harnessSlug: pkg.stack.harnessSlug,
      sku: pkg.stack.sku,
      setting: pkg.stack.setting,
    }),
  });
  const db = await ensureReady();
  const existing = await db
    .select()
    .from(submissions)
    .where(eq(submissions.integrity, pkg.integrity))
    .limit(1);
  if (existing[0]) {
    return { ok: true, id: existing[0].id, verify, error: "This exact package was already submitted." };
  }

  const blocked = screen.recommend === "reject";
  const name = identity.local?.model.name ?? identity.match?.modelName ?? pkg.stack.modelName ?? pkg.stack.sku;
  const lab = identity.local?.model.lab ?? identity.match?.labName ?? "Unlisted";
  const provider = identity.local?.endpoint.provider ?? identity.match?.providerName ?? "unlisted";
  const id = crypto.randomUUID();
  await db.insert(submissions).values({
    id,
    status: blocked ? "rejected" : "verified",
    integrity: pkg.integrity,
    suiteHash: pkg.suiteHash,
    modelName: name,
    modelSlug: identity.local?.model.slug ?? identity.match?.slug ?? slugify(pkg.stack.sku),
    lab,
    harnessId,
    harnessSlug: pkg.stack.harnessSlug,
    provider,
    sku: pkg.stack.sku,
    setting: pkg.stack.setting,
    tasks: pkg.totals.tasks,
    passed: pkg.totals.passed,
    inputTokens: pkg.totals.input,
    outputTokens: pkg.totals.output,
    reasoningTokens: pkg.totals.reasoning,
    cacheHitTokens: pkg.totals.cacheHit,
    cacheWriteTokens: pkg.totals.cacheWrite ?? 0,
    ...clockFromPackage(pkg),
    packageJson: JSON.stringify(pkg),
    note: String(formData.get("note") ?? "").trim() || null,
    reviewNote: blocked
      ? `Blocked: ${screen.reasons.join(" ")}`
      : screen.reasons.join(" "),
    userId: user.id,
    screenJson: JSON.stringify(screen),
    newModel: catalogKnown ? 0 : 1,
    createdAt: new Date().toISOString(),
  });

  if (blocked && screen.identity === "bad") {
    const rejects = user.rejectCount + 1;
    await db
      .update(users)
      .set({
        rejectCount: rejects,
        reputation: afterReject(user.reputation),
        status: shouldBan(rejects, user.status) ? "banned" : user.status,
      })
      .where(eq(users.id, user.id));
  } else if (!blocked && screen.recommend !== "publish" && screen.corroboration.independent >= 1) {
    await db
      .update(users)
      .set({ reputation: afterCorroborate(user.reputation) })
      .where(eq(users.id, user.id));
  }

  if (!blocked && screen.recommend === "publish") {
    await applyPublishedSubmission(id, {
      reviewNote: `Published automatically. Reputation ${user.reputation} meets the auto-publish bar.`,
    });
    return { ok: true, id, published: true, verify };
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/eval");
  if (blocked) {
    return { error: screen.reasons.join(" "), verify };
  }
  return { ok: true, id, published: false, verify };
}

export type ListedSubmission = Awaited<ReturnType<typeof listSubmissions>>[number];

export async function listSubmissions() {
  await requireAdmin();
  const db = await ensureReady();
  const [rows, catalog, aliases] = await Promise.all([
    db
      .select({ submission: submissions, username: users.username, reputation: users.reputation })
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .orderBy(desc(submissions.createdAt)),
    loadCatalog(),
    listCatalogAliases(db),
  ]);
  return rows.map((row) => {
    const hints = hintsFromSubmission(row.submission);
    const match = resolveCatalogModel(catalog, aliases, hints);
    const providerId =
      match?.providerId || detectProviderId(catalog, aliases, hints) || "";
    const providerName =
      match?.providerName ||
      (providerId && catalog.providers[providerId]?.name) ||
      row.submission.provider;
    return {
      ...row.submission,
      username: row.username,
      reputation: row.reputation,
      screen: parseScreen(row.submission.screenJson),
      labId: match?.labId ?? null,
      labName: match?.labName ?? row.submission.lab,
      providerId,
      providerName,
      offerings: (match?.offerings ?? []).map((item) => ({
        id: item.providerId,
        name: item.providerName,
      })),
    };
  });
}

function parseScreen(raw: string | null): ScreenReport | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScreenReport;
  } catch {
    return null;
  }
}

export async function rescreenSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row || row.status === "published") return;

  const identity = await resolveRunIdentity(hintsFromSubmission(row));
  const catalogKnown = Boolean(identity.match) || Boolean(identity.local);
  const [owner] = row.userId
    ? await db.select().from(users).where(eq(users.id, row.userId)).limit(1)
    : [];
  const screen = screenSubmission({
    harnessSlug: row.harnessSlug,
    sku: row.sku,
    catalogKnown,
    user: owner
      ? {
          reputation: owner.reputation,
          status: owner.status,
          rejectCount: owner.rejectCount,
        }
      : { reputation: 0, status: "active", rejectCount: 0 },
    peers: await peerSamples({
      suiteHash: row.suiteHash,
      harnessSlug: row.harnessSlug,
      sku: row.sku,
      setting: row.setting,
    }),
  });
  const blocked = screen.recommend === "reject";
  await db
    .update(submissions)
    .set({
      status: blocked ? "rejected" : "verified",
      modelName: identity.local?.model.name ?? identity.match?.modelName ?? row.sku,
      modelSlug: identity.local?.model.slug ?? identity.match?.slug ?? slugify(row.sku),
      lab: identity.local?.model.lab ?? identity.match?.labName ?? "Unlisted",
      provider: identity.local?.endpoint.provider ?? identity.match?.providerName ?? "unlisted",
      newModel: catalogKnown ? 0 : 1,
      screenJson: JSON.stringify(screen),
      reviewNote: blocked
        ? `Blocked: ${screen.reasons.join(" ")}`
        : screen.reasons.join(" "),
    })
    .where(eq(submissions.id, id));
  if (!blocked && screen.recommend === "publish") {
    await applyPublishedSubmission(id, {
      reviewNote: "Published automatically after re-screen.",
    });
    return;
  }
  revalidatePath("/admin/submissions");
}

function clockFromSubmission(row: {
  attempts: number | null;
  durationMs: number | null;
  packageJson: string;
}): { attempts: number | null; durationMs: number | null } {
  if (row.attempts != null && row.durationMs != null) {
    return { attempts: row.attempts, durationMs: row.durationMs };
  }
  try {
    const clock = clockFromPackage(parseEvalPackage(JSON.parse(row.packageJson)));
    return {
      attempts: row.attempts ?? (clock.attempts > 0 ? clock.attempts : null),
      durationMs: row.durationMs ?? clock.durationMs,
    };
  } catch {
    return { attempts: row.attempts, durationMs: row.durationMs };
  }
}

export async function setSubmissionProviderAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!id || !providerId) return;
  const db = await ensureReady();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row) return;

  const catalog = await loadCatalog();
  const name = catalog.providers[providerId]?.name ?? providerId;
  await db
    .update(submissions)
    .set({
      provider: providerId,
      reviewNote: `Provider set to ${name}.`,
    })
    .where(eq(submissions.id, id));

  if (row.status === "published") {
    const match = await detectFromRun(db, {
      ...hintsFromSubmission({ ...row, provider: providerId }),
      provider: providerId,
    });
    if (match) {
      await ensureCatalogIdentity(db, { ...match, providerId, providerName: name });
      revalidatePath("/");
      revalidatePath("/stacks");
      revalidatePath(`/models/${match.slug}`);
    }
  }
  revalidatePath("/admin/submissions");
}

export async function publishSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await applyPublishedSubmission(id, {
    reviewNote: undefined,
  });
}

async function applyPublishedSubmission(
  id: string,
  options?: { reviewNote?: string },
): Promise<void> {
  const db = await ensureReady();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row || row.status === "published") return;
  const clock = clockFromSubmission(row);

  const now = new Date().toISOString();
  const detected = await resolveRunIdentity(hintsFromSubmission(row));

  let model = detected.local?.model ?? null;
  if (detected.match) {
    const persisted = await ensureCatalogIdentity(db, detected.match, {
      notes: `Opened from a screened package ${row.integrity.slice(0, 12)}.`,
    });
    model = persisted.model;
  } else if (!model) {
    const slug = row.modelSlug;
    const [existing] = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
    if (existing) {
      model = existing;
    } else {
      const modelId = crypto.randomUUID();
      await db.insert(models).values({
        id: modelId,
        slug,
        name: row.sku,
        lab: "Unlisted",
        tokenizerKey: "manual",
        status: "published",
        notes: `Opened from a screened package ${row.integrity.slice(0, 12)}.`,
        createdAt: now,
        updatedAt: now,
      });
      [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
    }
    if (model) {
      const eps = await db.select().from(endpoints).where(eq(endpoints.modelId, model.id));
      if (!eps.find((item) => item.sku === row.sku)) {
        await db.insert(endpoints).values({
          id: crypto.randomUUID(),
          modelId: model.id,
          provider: row.provider || "unlisted",
          sku: row.sku,
          displayName: row.sku,
          listInput: 0,
          listOutput: null,
          listCacheHit: null,
          listCacheWrite: null,
          contextNote: "Opened from a screened community package.",
          status: "published",
          sortOrder: 0,
        });
      }
    }
  }
  if (!model) return;

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
      cacheWriteTokens: row.cacheWriteTokens ?? 0,
      attempts: clock.attempts,
      durationMs: clock.durationMs,
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
        cacheWriteTokens: row.cacheWriteTokens ?? 0,
        attempts: clock.attempts,
        durationMs: clock.durationMs,
        source: "official",
        notes: `Community package ${row.integrity}`,
        measuredAt: now,
      },
    });

  if (row.userId) {
    const [owner] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (owner && owner.status === "active") {
      await db
        .update(users)
        .set({ reputation: afterPublish(owner.reputation) })
        .where(eq(users.id, owner.id));
    }
  }

  await db
    .update(submissions)
    .set({
      status: "published",
      reviewNote:
        options?.reviewNote ??
        (row.status === "rejected"
          ? "Published by admin override."
          : "Published to Stacks."),
    })
    .where(eq(submissions.id, id));

  revalidatePath("/");
  revalidatePath("/stacks");
  revalidatePath(`/models/${model.slug}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/users");
  revalidatePath("/eval");
}

export async function unpublishSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row || row.status !== "published") return;

  const [model] = await db.select().from(models).where(eq(models.slug, row.modelSlug)).limit(1);
  if (model) {
    await db
      .delete(workRuns)
      .where(
        and(
          eq(workRuns.modelId, model.id),
          eq(workRuns.harnessId, row.harnessId),
          eq(workRuns.suiteVersion, WORK_SUITE_VERSION),
          eq(workRuns.setting, row.setting),
        ),
      );
  }

  await db
    .update(submissions)
    .set({
      status: "verified",
      reviewNote: "Removed from Stacks by admin.",
    })
    .where(eq(submissions.id, id));

  revalidatePath("/");
  revalidatePath("/stacks");
  if (model) revalidatePath(`/models/${model.slug}`);
  revalidatePath("/admin/submissions");
  if (model) revalidatePath(`/admin/models/${model.id}`);
}

export async function rejectSubmissionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  const [row] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!row || row.status === "published") return;
  await db
    .update(submissions)
    .set({ status: "rejected", reviewNote: "Rejected by admin." })
    .where(eq(submissions.id, id));
  if (row.userId) {
    const [owner] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (owner) {
      const rejects = owner.rejectCount + 1;
      await db
        .update(users)
        .set({
          rejectCount: rejects,
          reputation: afterReject(owner.reputation),
          status: shouldBan(rejects, owner.status) ? "banned" : owner.status,
        })
        .where(eq(users.id, owner.id));
    }
  }
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/users");
}
