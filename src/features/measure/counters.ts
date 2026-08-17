import type { TokenizerKey } from "@/features/pricing/types";

type EncodingName = "o200k_base" | "cl100k_base";

export function canCount(key: TokenizerKey): key is EncodingName {
  return key === "o200k_base" || key === "cl100k_base";
}

export async function countNativeTokens(
  key: TokenizerKey,
  text: string,
): Promise<number> {
  if (!canCount(key)) {
    throw new Error(`No local counter for tokenizer "${key}". Enter token counts by hand.`);
  }
  const { getEncoding } = await import("js-tiktoken");
  const enc = getEncoding(key);
  return enc.encode(text).length;
}
