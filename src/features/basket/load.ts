import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { SCENARIOS, SLICES, type ScenarioDef, type SliceDef } from "@/features/basket/slices";
import { characterCount } from "@/features/pricing/math";
import type { ScenarioId, SliceId } from "@/features/pricing/types";

const ROOT = process.cwd();

export type LoadedSlice = SliceDef & {
  text: string;
  characters: number;
};

export type LoadedScenario = ScenarioDef & {
  input: string;
  output: string;
  inputCharacters: number;
  outputCharacters: number;
};

export async function readBasketFile(rel: string): Promise<string> {
  return readFile(path.join(ROOT, "data", "basket", rel), "utf8");
}

export async function readScenarioFile(rel: string): Promise<string> {
  return readFile(path.join(ROOT, "data", "scenarios", rel), "utf8");
}

export async function loadSlices(): Promise<LoadedSlice[]> {
  return Promise.all(
    SLICES.map(async (slice) => {
      const text = await readBasketFile(slice.file);
      return { ...slice, text, characters: characterCount(text) };
    }),
  );
}

export async function loadSliceMap(): Promise<Record<SliceId, LoadedSlice>> {
  const slices = await loadSlices();
  return Object.fromEntries(slices.map((slice) => [slice.id, slice])) as Record<
    SliceId,
    LoadedSlice
  >;
}

export async function loadScenarios(): Promise<LoadedScenario[]> {
  return Promise.all(
    SCENARIOS.map(async (scenario) => {
      const input = await readScenarioFile(scenario.inputFile);
      const output = await readScenarioFile(scenario.outputFile);
      return {
        ...scenario,
        input,
        output,
        inputCharacters: characterCount(input),
        outputCharacters: characterCount(output),
      };
    }),
  );
}

export async function loadScenarioMap(): Promise<
  Record<ScenarioId, LoadedScenario>
> {
  const scenarios = await loadScenarios();
  return Object.fromEntries(
    scenarios.map((scenario) => [scenario.id, scenario]),
  ) as Record<ScenarioId, LoadedScenario>;
}
