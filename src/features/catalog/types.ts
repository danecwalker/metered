import type { WorkSummary } from "@/features/catalog/rank";
import type { TokenizerKey } from "@/features/pricing/types";

export type { WorkSummary };

export type IndexRow = {
  endpointId: string;
  modelId: string;
  slug: string;
  name: string;
  stack: string;
  lab: string;
  harnessId: string | null;
  harnessName: string | null;
  harnessSlug: string | null;
  provider: string;
  sku: string;
  displayName: string;
  tokenizerKey: TokenizerKey;
  listInput: number;
  listOutput: number | null;
  fertilityIn: number | null;
  trueInput: number | null;
  trueOutput: number | null;
  measuredSlices: number;
  estimateSlices: number;
  work: WorkSummary | null;
};

export function hasDollarsPerMu(rows: IndexRow[]): boolean {
  return rows.some((row) => row.work?.dollarsPerMu != null);
}
