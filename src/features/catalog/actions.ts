"use server";

import { quoteText, type QuoteRow } from "@/features/catalog/quote";

export type QuoteState = {
  error?: string;
  characters?: number;
  units?: number;
  rows?: QuoteRow[];
};

export async function quoteAction(
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const text = String(formData.get("text") ?? "");
  if (!text.trim()) {
    return { error: "Paste the text you want priced." };
  }
  if (text.length > 80_000) {
    return { error: "Keep pasted text under 80,000 characters for this preview." };
  }
  const result = await quoteText(text);
  return result;
}
