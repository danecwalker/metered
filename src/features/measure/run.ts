import { eq } from "drizzle-orm";
import { measurements } from "@/db/schema";
import type { getDb } from "@/db/client";
import { loadSlices } from "@/features/basket/load";
import { countNativeTokens } from "@/features/measure/counters";
import type { MeasurementSource, TokenizerKey } from "@/features/pricing/types";

type Db = ReturnType<typeof getDb>;

export async function measureModelOnBasket(
  db: Db,
  args: {
    modelId: string;
    tokenizerKey: TokenizerKey;
    source: MeasurementSource;
  },
): Promise<number> {
  const slices = await loadSlices();
  const now = new Date().toISOString();
  let wrote = 0;

  for (const slice of slices) {
    const nativeTokens = await countNativeTokens(args.tokenizerKey, slice.text);
    await db
      .insert(measurements)
      .values({
        id: crypto.randomUUID(),
        modelId: args.modelId,
        sliceId: slice.id,
        nativeTokens,
        characterCount: slice.characters,
        source: args.source,
        measuredAt: now,
      })
      .onConflictDoUpdate({
        target: [measurements.modelId, measurements.sliceId],
        set: {
          nativeTokens,
          characterCount: slice.characters,
          source: args.source,
          measuredAt: now,
        },
      });
    wrote += 1;
  }

  return wrote;
}

export async function upsertMeasurement(
  db: Db,
  args: {
    modelId: string;
    sliceId: string;
    nativeTokens: number;
    characterCount: number;
    source: MeasurementSource;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(measurements)
    .values({
      id: crypto.randomUUID(),
      modelId: args.modelId,
      sliceId: args.sliceId,
      nativeTokens: args.nativeTokens,
      characterCount: args.characterCount,
      source: args.source,
      measuredAt: now,
    })
    .onConflictDoUpdate({
      target: [measurements.modelId, measurements.sliceId],
      set: {
        nativeTokens: args.nativeTokens,
        characterCount: args.characterCount,
        source: args.source,
        measuredAt: now,
      },
    });
}

export async function deleteMeasurementsForModel(db: Db, modelId: string) {
  await db.delete(measurements).where(eq(measurements.modelId, modelId));
}
