"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureReady } from "@/db/client";
import { endpoints, models, submissions, workRuns } from "@/db/schema";
import {
  ADMIN_COOKIE,
  authConfigured,
  authUnconfiguredMessage,
  expectedSessionToken,
  passwordsMatch,
  requireAdmin,
} from "@/features/admin/auth";
import {
  endpointFormSchema,
  measurementFormSchema,
  modelFormSchema,
  optionalNumber,
  workRunFormSchema,
} from "@/features/admin/schemas";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";
import { loadSliceMap } from "@/features/basket/load";
import { canCount } from "@/features/measure/counters";
import { measureModelOnBasket, upsertMeasurement } from "@/features/measure/run";

export type ActionState = { ok: false; error: string } | { ok: true; message?: string };

function fail(error: string): ActionState {
  return { ok: false, error };
}

function revalidatePublic(slug?: string) {
  revalidatePath("/");
  revalidatePath("/stacks");
  revalidatePath("/methodology");
  if (slug) revalidatePath(`/models/${slug}`);
  revalidatePath("/admin");
}

export async function loginAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  if (!authConfigured()) {
    return fail(authUnconfiguredMessage() ?? "Admin is not configured.");
  }
  const password = String(formData.get("password") ?? "");
  if (!passwordsMatch(password)) {
    return fail("That password did not match.");
  }
  const token = await expectedSessionToken();
  if (!token) return fail("Admin auth is not configured.");
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  const next = String(formData.get("next") ?? "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function createModelAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = modelFormSchema.safeParse({
    name: formData.get("name"),
    lab: formData.get("lab"),
    slug: formData.get("slug"),
    tokenizerKey: formData.get("tokenizerKey"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const db = await ensureReady();
  const existing = await db.select().from(models).where(eq(models.slug, parsed.data.slug)).limit(1);
  if (existing.length) return fail("That slug is already in use.");

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.insert(models).values({
    id,
    ...parsed.data,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePublic(parsed.data.slug);
  redirect(`/admin/models/${id}`);
}

export async function updateModelAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing model id.");
  const parsed = modelFormSchema.safeParse({
    name: formData.get("name"),
    lab: formData.get("lab"),
    slug: formData.get("slug"),
    tokenizerKey: formData.get("tokenizerKey"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const db = await ensureReady();
  const clash = await db
    .select()
    .from(models)
    .where(and(eq(models.slug, parsed.data.slug)))
    .limit(1);
  if (clash[0] && clash[0].id !== id) return fail("That slug is already in use.");

  await db
    .update(models)
    .set({
      ...parsed.data,
      notes: parsed.data.notes ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(models.id, id));
  revalidatePublic(parsed.data.slug);
  return { ok: true, message: "Model saved." };
}

export async function deleteModelAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (model) {
    await db.delete(models).where(eq(models.id, id));
    revalidatePublic(model.slug);
  }
  redirect("/admin");
}

export async function createEndpointAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const modelId = String(formData.get("modelId") ?? "");
  if (!modelId) return fail("Missing model id.");
  const parsed = endpointFormSchema.safeParse({
    provider: formData.get("provider"),
    sku: formData.get("sku"),
    displayName: formData.get("displayName"),
    listInput: formData.get("listInput"),
    listOutput: formData.get("listOutput"),
    listCacheHit: formData.get("listCacheHit"),
    listCacheWrite: formData.get("listCacheWrite"),
    contextNote: formData.get("contextNote") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the endpoint.");

  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) return fail("Model not found.");

  await db.insert(endpoints).values({
    id: crypto.randomUUID(),
    modelId,
    provider: parsed.data.provider,
    sku: parsed.data.sku,
    displayName: parsed.data.displayName,
    listInput: parsed.data.listInput,
    listOutput: optionalNumber(formData.get("listOutput")),
    listCacheHit: optionalNumber(formData.get("listCacheHit")),
    listCacheWrite: optionalNumber(formData.get("listCacheWrite")),
    contextNote: parsed.data.contextNote ?? null,
    status: parsed.data.status,
    sortOrder: 0,
  });
  revalidatePublic(model.slug);
  return { ok: true, message: "Endpoint added." };
}

export async function updateEndpointAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing endpoint id.");
  const parsed = endpointFormSchema.safeParse({
    provider: formData.get("provider"),
    sku: formData.get("sku"),
    displayName: formData.get("displayName"),
    listInput: formData.get("listInput"),
    listOutput: formData.get("listOutput"),
    listCacheHit: formData.get("listCacheHit"),
    listCacheWrite: formData.get("listCacheWrite"),
    contextNote: formData.get("contextNote") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the endpoint.");

  const db = await ensureReady();
  const [endpoint] = await db.select().from(endpoints).where(eq(endpoints.id, id)).limit(1);
  if (!endpoint) return fail("Endpoint not found.");
  const [model] = await db.select().from(models).where(eq(models.id, endpoint.modelId)).limit(1);

  await db
    .update(endpoints)
    .set({
      provider: parsed.data.provider,
      sku: parsed.data.sku,
      displayName: parsed.data.displayName,
      listInput: parsed.data.listInput,
      listOutput: optionalNumber(formData.get("listOutput")),
      listCacheHit: optionalNumber(formData.get("listCacheHit")),
      listCacheWrite: optionalNumber(formData.get("listCacheWrite")),
      contextNote: parsed.data.contextNote ?? null,
      status: parsed.data.status,
    })
    .where(eq(endpoints.id, id));
  revalidatePublic(model?.slug);
  return { ok: true, message: "Endpoint saved." };
}

export async function deleteEndpointAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  const [endpoint] = await db.select().from(endpoints).where(eq(endpoints.id, id)).limit(1);
  if (endpoint) {
    const [model] = await db.select().from(models).where(eq(models.id, endpoint.modelId)).limit(1);
    await db.delete(endpoints).where(eq(endpoints.id, id));
    revalidatePublic(model?.slug);
    if (model) redirect(`/admin/models/${model.id}`);
  }
  redirect("/admin");
}

export async function saveMeasurementAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const modelId = String(formData.get("modelId") ?? "");
  const parsed = measurementFormSchema.safeParse({
    sliceId: formData.get("sliceId"),
    nativeTokens: formData.get("nativeTokens"),
  });
  if (!modelId) return fail("Missing model id.");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the count.");

  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) return fail("Model not found.");
  const slices = await loadSliceMap();
  const slice = slices[parsed.data.sliceId];
  await upsertMeasurement(db, {
    modelId,
    sliceId: parsed.data.sliceId,
    nativeTokens: parsed.data.nativeTokens,
    characterCount: slice.characters,
    source: "manual",
  });
  revalidatePublic(model.slug);
  return { ok: true, message: `Saved ${slice.label} count.` };
}

export async function measureBasketAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const modelId = String(formData.get("modelId") ?? "");
  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) return fail("Model not found.");
  if (!canCount(model.tokenizerKey)) {
    return fail("This tokenizer has no local counter. Enter native token counts by hand.");
  }
  const wrote = await measureModelOnBasket(db, {
    modelId: model.id,
    tokenizerKey: model.tokenizerKey,
    source: "official",
  });
  revalidatePublic(model.slug);
  return { ok: true, message: `Counted ${wrote} basket slices with ${model.tokenizerKey}.` };
}

export async function saveWorkRunAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const modelId = String(formData.get("modelId") ?? "");
  if (!modelId) return fail("Missing model id.");
  const parsed = workRunFormSchema.safeParse({
    harnessId: formData.get("harnessId"),
    setting: formData.get("setting") || "default",
    tasks: formData.get("tasks"),
    passed: formData.get("passed"),
    inputTokens: formData.get("inputTokens"),
    outputTokens: formData.get("outputTokens"),
    reasoningTokens: formData.get("reasoningTokens") || 0,
    cacheHitTokens: formData.get("cacheHitTokens") || 0,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the work run.");

  const passed = optionalNumber(formData.get("passed"));
  if (passed != null && passed > parsed.data.tasks) {
    return fail("Passed tasks cannot exceed tasks run.");
  }

  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) return fail("Model not found.");

  const now = new Date().toISOString();
  await db
    .insert(workRuns)
    .values({
      id: crypto.randomUUID(),
      modelId,
      harnessId: parsed.data.harnessId,
      suiteVersion: WORK_SUITE_VERSION,
      setting: parsed.data.setting,
      tasks: parsed.data.tasks,
      passed,
      inputTokens: parsed.data.inputTokens,
      outputTokens: parsed.data.outputTokens,
      reasoningTokens: parsed.data.reasoningTokens,
      cacheHitTokens: parsed.data.cacheHitTokens,
      source: "manual",
      notes: parsed.data.notes ?? null,
      measuredAt: now,
    })
    .onConflictDoUpdate({
      target: [workRuns.modelId, workRuns.harnessId, workRuns.suiteVersion, workRuns.setting],
      set: {
        tasks: parsed.data.tasks,
        passed,
        inputTokens: parsed.data.inputTokens,
        outputTokens: parsed.data.outputTokens,
        reasoningTokens: parsed.data.reasoningTokens,
        cacheHitTokens: parsed.data.cacheHitTokens,
        source: "manual",
        notes: parsed.data.notes ?? null,
        measuredAt: now,
      },
    });
  revalidatePublic(model.slug);
  return { ok: true, message: "Work run saved for that harness. Stacks lists model × harness." };
}

export async function deleteWorkRunAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await ensureReady();
  const [run] = await db.select().from(workRuns).where(eq(workRuns.id, id)).limit(1);
  if (!run) return;
  const [model] = await db.select().from(models).where(eq(models.id, run.modelId)).limit(1);
  await db.delete(workRuns).where(eq(workRuns.id, id));
  if (model) {
    await db
      .update(submissions)
      .set({
        status: "verified",
        reviewNote: "Removed from Stacks by admin.",
      })
      .where(
        and(
          eq(submissions.modelSlug, model.slug),
          eq(submissions.harnessId, run.harnessId),
          eq(submissions.setting, run.setting),
          eq(submissions.status, "published"),
        ),
      );
    revalidatePublic(model.slug);
    revalidatePath("/admin/submissions");
    revalidatePath(`/admin/models/${model.id}`);
  }
}
