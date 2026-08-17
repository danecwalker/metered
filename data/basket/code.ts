type EncodingName = "o200k_base" | "cl100k_base";

export type CountResult = {
  characters: number;
  meteredUnits: number;
  nativeTokens: number;
  fertility: number;
};

const CHARS_PER_MU = 4;

export function normalizeForMeter(text: string): string {
  return text.normalize("NFC").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function countCharacters(text: string): number {
  return [...normalizeForMeter(text)].length;
}

export function toMeteredUnits(characters: number): number {
  if (characters < 0) {
    throw new RangeError("character count cannot be negative");
  }
  return characters / CHARS_PER_MU;
}

export function fertilityOf(nativeTokens: number, characters: number): number {
  const units = toMeteredUnits(characters);
  if (units === 0) {
    throw new RangeError("cannot compute fertility on empty text");
  }
  return nativeTokens / units;
}

export function truePricePerMillion(
  listPrice: number,
  fertility: number,
): number {
  return listPrice * fertility;
}

export function quotePayload(args: {
  inputTokens: number;
  outputTokens: number;
  listInput: number;
  listOutput: number;
}): number {
  return (
    (args.inputTokens / 1_000_000) * args.listInput +
    (args.outputTokens / 1_000_000) * args.listOutput
  );
}

export class TokenizerAdapter {
  constructor(private readonly encoding: EncodingName) {}

  name(): EncodingName {
    return this.encoding;
  }

  async count(text: string): Promise<CountResult> {
    const characters = countCharacters(text);
    const nativeTokens = await this.encodeLength(text);
    return {
      characters,
      meteredUnits: toMeteredUnits(characters),
      nativeTokens,
      fertility: fertilityOf(nativeTokens, characters),
    };
  }

  private async encodeLength(text: string): Promise<number> {
    const { getEncoding } = await import("js-tiktoken");
    const enc = getEncoding(this.encoding);
    try {
      return enc.encode(text).length;
    } finally {
      enc.free();
    }
  }
}

export function rankByTrueInput<T extends { trueInput: number | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (a.trueInput == null && b.trueInput == null) return 0;
    if (a.trueInput == null) return 1;
    if (b.trueInput == null) return -1;
    return a.trueInput - b.trueInput;
  });
}
