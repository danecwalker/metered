import type { Metadata } from "next";
import { QuoteForm } from "@/shared/ui/quote-form";

export const metadata: Metadata = {
  title: "Compare",
  description: "Paste text and see what each published model charges to send or receive it.",
};

export default function ComparePage() {
  return (
    <section className="wrap section">
      <h1 className="section__title">Price the same string</h1>
      <p className="section__lede">
        This is the argument in one paste. We count your text with each official
        local tokenizer and multiply by that endpoint’s sticker. Models without
        a local counter are listed, not invented.
      </p>
      <QuoteForm />
    </section>
  );
}
