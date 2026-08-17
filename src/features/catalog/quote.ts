import "server-only";

import { and, eq } from "drizzle-orm";
import { ensureReady } from "@/db/client";
import { endpoints, measurements, models } from "@/db/schema";
import { SLICES } from "@/features/basket/slices";
import { canCount, countNativeTokens } from "@/features/measure/counters";
import {
  characterCount,
  costForTokens,
  fertility,
  meteredUnits,
  weightedMean,
} from "@/features/pricing/math";

export type QuoteRow = {
  slug: string;
  name: string;
  lab: string;
  provider: string;
  tokenizerKey: string;
  characters: number;
  units: number;
  nativeTokens: number | null;
  fertility: number | null;
  listInput: number;
  listOutput: number | null;
  costIfInput: number | null;
  costIfOutput: number | null;
  skipped: string | null;
};

export async function quoteText(text: string): Promise<{
  characters: number;
  units: number;
  rows: QuoteRow[];
}> {
  const characters = characterCount(text);
  const units = meteredUnits(characters);
  const db = await ensureReady();
  const published = await db
    .select({ endpoint: endpoints, model: models })
    .from(endpoints)
    .innerJoin(models, eq(endpoints.modelId, models.id))
    .where(and(eq(endpoints.status, "published"), eq(models.status, "published")));

  const allMeasurements = await db.select().from(measurements);
  const fertByModel = new Map<string, number>();
  for (const { model } of published) {
    const rowsFor = allMeasurements.filter((row) => row.modelId === model.id);
    const mean = weightedMean(
      rowsFor.flatMap((row) => {
        const slice = SLICES.find((item) => item.id === row.sliceId);
        const fert = fertility(row.nativeTokens, row.characterCount);
        if (!slice || fert == null) return [];
        return [{ value: fert, weight: slice.weight }];
      }),
    );
    if (mean != null) fertByModel.set(model.id, mean);
  }

  const rows: QuoteRow[] = [];
  for (const { endpoint, model } of published) {
    if (!canCount(model.tokenizerKey)) {
      const stored = fertByModel.get(model.id);
      if (stored == null) {
        rows.push({
          slug: model.slug,
          name: model.name,
          lab: model.lab,
          provider: endpoint.provider,
          tokenizerKey: model.tokenizerKey,
          characters,
          units,
          nativeTokens: null,
          fertility: null,
          listInput: endpoint.listInput,
          listOutput: endpoint.listOutput,
          costIfInput: null,
          costIfOutput: null,
          skipped: "No local tokenizer and no stored fertility yet.",
        });
        continue;
      }
      const implied = units * stored;
      rows.push({
        slug: model.slug,
        name: model.name,
        lab: model.lab,
        provider: endpoint.provider,
        tokenizerKey: model.tokenizerKey,
        characters,
        units,
        nativeTokens: Math.round(implied),
        fertility: stored,
        listInput: endpoint.listInput,
        listOutput: endpoint.listOutput,
        costIfInput: costForTokens(implied, endpoint.listInput),
        costIfOutput:
          endpoint.listOutput == null
            ? null
            : costForTokens(implied, endpoint.listOutput),
        skipped: "Estimated from stored basket fertility, not a live lab count.",
      });
      continue;
    }
    const nativeTokens = await countNativeTokens(model.tokenizerKey, text);
    const fert = fertility(nativeTokens, characters);
    rows.push({
      slug: model.slug,
      name: model.name,
      lab: model.lab,
      provider: endpoint.provider,
      tokenizerKey: model.tokenizerKey,
      characters,
      units,
      nativeTokens,
      fertility: fert,
      listInput: endpoint.listInput,
      listOutput: endpoint.listOutput,
      costIfInput: costForTokens(nativeTokens, endpoint.listInput),
      costIfOutput:
        endpoint.listOutput == null
          ? null
          : costForTokens(nativeTokens, endpoint.listOutput),
      skipped: null,
    });
  }

  rows.sort((a, b) => {
    if (a.costIfInput == null && b.costIfInput == null) return a.name.localeCompare(b.name);
    if (a.costIfInput == null) return 1;
    if (b.costIfInput == null) return -1;
    return a.costIfInput - b.costIfInput;
  });

  return { characters, units, rows };
}
