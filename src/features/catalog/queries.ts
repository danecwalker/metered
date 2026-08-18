import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { ensureReady } from "@/db/client";
import {
  endpoints,
  harnesses,
  measurements,
  models,
  workRuns,
  type EndpointRow,
  type HarnessRow,
  type MeasurementRow,
  type ModelRow,
  type WorkRunRow,
} from "@/db/schema";
import { stackLabel } from "@/features/harness/catalog";
import { SLICES } from "@/features/basket/slices";
import { loadOfficialSuite } from "@/features/eval/suite";
import {
  rankIndexRows,
  summarizeWork,
} from "@/features/catalog/rank";
import {
  hasDollarsPerMu,
  type IndexRow,
} from "@/features/catalog/types";
import {
  fertility,
  runIsComplete,
  tokensPerPass,
  truePrice,
  weightedMean,
  WORK_SUITE_VERSION,
} from "@/features/pricing/math";
import type { MeasurementSource, SliceId } from "@/features/pricing/types";

export type { IndexRow, WorkSummary } from "@/features/catalog/types";
export { hasDollarsPerMu };

export type SliceScore = {
  sliceId: SliceId;
  label: string;
  weight: number;
  nativeTokens: number;
  characters: number;
  fertility: number | null;
  source: MeasurementSource;
  trueInput: number | null;
  trueOutput: number | null;
};

export type ModelDetail = {
  model: ModelRow;
  endpoints: EndpointRow[];
  slices: SliceScore[];
  workRuns: (WorkRunRow & { harness: HarnessRow })[];
  composite: {
    fertility: number | null;
    trueInput: number | null;
    trueOutput: number | null;
  };
};

function scoresFor(
  modelMeasurements: MeasurementRow[],
  listInput: number,
  listOutput: number | null,
): SliceScore[] {
  const bySlice = new Map(modelMeasurements.map((row) => [row.sliceId, row]));
  return SLICES.map((slice) => {
    const row = bySlice.get(slice.id);
    if (!row) {
      return {
        sliceId: slice.id,
        label: slice.label,
        weight: slice.weight,
        nativeTokens: 0,
        characters: 0,
        fertility: null,
        source: "manual" as const,
        trueInput: null,
        trueOutput: null,
      };
    }
    const fert = fertility(row.nativeTokens, row.characterCount);
    return {
      sliceId: slice.id,
      label: slice.label,
      weight: slice.weight,
      nativeTokens: row.nativeTokens,
      characters: row.characterCount,
      fertility: fert,
      source: row.source,
      trueInput: fert == null ? null : truePrice(listInput, fert),
      trueOutput:
        fert == null || listOutput == null ? null : truePrice(listOutput, fert),
    };
  });
}

function compositeOf(scores: SliceScore[]) {
  const measured = scores.filter((score) => score.fertility != null);
  const fert = weightedMean(
    measured.map((score) => ({ value: score.fertility as number, weight: score.weight })),
  );
  const trueIn = weightedMean(
    measured
      .filter((score) => score.trueInput != null)
      .map((score) => ({ value: score.trueInput as number, weight: score.weight })),
  );
  const trueOut = weightedMean(
    measured
      .filter((score) => score.trueOutput != null)
      .map((score) => ({ value: score.trueOutput as number, weight: score.weight })),
  );
  return { fertility: fert, trueInput: trueIn, trueOutput: trueOut };
}

export const listPublishedIndex = cache(async function listPublishedIndex(): Promise<
  IndexRow[]
> {
  const db = await ensureReady();
  const suite = await loadOfficialSuite();
  const officialTasks = suite.tasks.length;
  const workMu = suite.workMu;
  const published = await db
    .select({
      endpoint: endpoints,
      model: models,
    })
    .from(endpoints)
    .innerJoin(models, eq(endpoints.modelId, models.id))
    .where(and(eq(endpoints.status, "published"), eq(models.status, "published")))
    .orderBy(asc(models.lab), asc(models.name));

  const allMeasurements = await db.select().from(measurements);
  const byModel = new Map<string, MeasurementRow[]>();
  for (const row of allMeasurements) {
    const list = byModel.get(row.modelId) ?? [];
    list.push(row);
    byModel.set(row.modelId, list);
  }

  const runs = await db
    .select({ run: workRuns, harness: harnesses })
    .from(workRuns)
    .innerJoin(harnesses, eq(workRuns.harnessId, harnesses.id))
    .where(eq(workRuns.suiteVersion, WORK_SUITE_VERSION));
  const runsByModel = new Map<string, { run: WorkRunRow; harness: HarnessRow }[]>();
  for (const row of runs) {
    const list = runsByModel.get(row.run.modelId) ?? [];
    list.push(row);
    runsByModel.set(row.run.modelId, list);
  }
  const tokenRates = runs
    .filter(({ run }) => runIsComplete(run.passed, run.tasks, officialTasks))
    .map(({ run }) =>
      tokensPerPass(run.inputTokens, run.outputTokens, run.reasoningTokens, run.passed),
    )
    .filter((value): value is number => value != null && value > 0);
  const cheapestTokens = tokenRates.length ? Math.min(...tokenRates) : null;

  const rows: IndexRow[] = [];
  for (const { endpoint, model } of published) {
    const scores = scoresFor(
      byModel.get(model.id) ?? [],
      endpoint.listInput,
      endpoint.listOutput,
    );
    const composite = compositeOf(scores);
    const measured = scores.filter((score) => score.fertility != null);
    const modelRuns = runsByModel.get(model.id) ?? [];
    if (modelRuns.length === 0) continue;

    for (const stack of modelRuns) {
      rows.push({
        endpointId: endpoint.id,
        modelId: model.id,
        slug: model.slug,
        name: model.name,
        stack: stackLabel(model.name, stack.harness?.name ?? null),
        lab: model.lab,
        harnessId: stack.harness?.id ?? null,
        harnessName: stack.harness?.name ?? null,
        harnessSlug: stack.harness?.slug ?? null,
        provider: endpoint.provider,
        sku: endpoint.sku,
        displayName: endpoint.displayName,
        tokenizerKey: model.tokenizerKey,
        listInput: endpoint.listInput,
        listOutput: endpoint.listOutput,
        fertilityIn: composite.fertility,
        trueInput: composite.trueInput,
        trueOutput: composite.trueOutput,
        measuredSlices: measured.length,
        estimateSlices: measured.filter((score) => score.source === "estimate").length,
        work:
          stack.run && stack.harness
            ? summarizeWork(
                stack.run,
                stack.harness,
                endpoint,
                cheapestTokens,
                officialTasks,
                workMu,
              )
            : null,
      });
    }
  }

  return rankIndexRows(rows);
});

export async function getModelBySlug(slug: string): Promise<ModelDetail | null> {
  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  if (!model) return null;
  const modelEndpoints = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.modelId, model.id))
    .orderBy(asc(endpoints.sortOrder), asc(endpoints.provider));
  const modelMeasurements = await db
    .select()
    .from(measurements)
    .where(eq(measurements.modelId, model.id));
  const primary = modelEndpoints.find((row) => row.status === "published") ?? modelEndpoints[0];
  const slices = scoresFor(
    modelMeasurements,
    primary?.listInput ?? 0,
    primary?.listOutput ?? null,
  );
  const modelWork = await db
    .select({ run: workRuns, harness: harnesses })
    .from(workRuns)
    .innerJoin(harnesses, eq(workRuns.harnessId, harnesses.id))
    .where(
      and(eq(workRuns.modelId, model.id), eq(workRuns.suiteVersion, WORK_SUITE_VERSION)),
    );
  return {
    model,
    endpoints: modelEndpoints,
    slices,
    workRuns: modelWork.map(({ run, harness }) => ({ ...run, harness })),
    composite: compositeOf(slices),
  };
}

export async function listHarnesses(): Promise<HarnessRow[]> {
  const db = await ensureReady();
  return db.select().from(harnesses).orderBy(asc(harnesses.name));
}

export async function listModelsAdmin(): Promise<
  (ModelRow & { endpointCount: number; measuredSlices: number })[]
> {
  const db = await ensureReady();
  const allModels = await db.select().from(models).orderBy(asc(models.lab), asc(models.name));
  const allEndpoints = await db.select().from(endpoints);
  const allMeasurements = await db.select().from(measurements);
  return allModels.map((model) => ({
    ...model,
    endpointCount: allEndpoints.filter((row) => row.modelId === model.id).length,
    measuredSlices: allMeasurements.filter((row) => row.modelId === model.id).length,
  }));
}

export async function getModelById(id: string): Promise<ModelDetail | null> {
  const db = await ensureReady();
  const [model] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (!model) return null;
  return getModelBySlug(model.slug);
}

export async function listPublishedModelsForSearch(): Promise<
  { slug: string; name: string; lab: string }[]
> {
  const db = await ensureReady();
  return db
    .select({ slug: models.slug, name: models.name, lab: models.lab })
    .from(models)
    .where(eq(models.status, "published"))
    .orderBy(asc(models.name));
}
