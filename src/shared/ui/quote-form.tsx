"use client";

import { useActionState } from "react";
import { quoteAction, type QuoteState } from "@/features/catalog/actions";
import { fert, moneyFine, whole } from "@/shared/lib/format";

const initial: QuoteState = {};

export function QuoteForm() {
  const [state, action, pending] = useActionState(quoteAction, initial);

  return (
    <form action={action} className="stack">
      <div className="field">
        <label className="field__label" htmlFor="quote-text">
          Text to price
        </label>
        <textarea
          className="textarea"
          id="quote-text"
          name="text"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby="quote-help"
          placeholder="Paste a prompt, schema, or page."
        />
        <p className="field__help" id="quote-help">
          {state.error
            ? state.error
            : "We count this string with each model’s official tokenizer when we have one."}
        </p>
      </div>
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? "Counting…" : "Price this text"}
        </button>
      </div>
      {state.rows ? (
        <div className="table-wrap">
          <p className="model-meta" style={{ padding: "0.6rem 0" }}>
            {whole(state.characters)} characters · {whole(state.units)} MU
          </p>
          <table className="price-table">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Native tokens</th>
                <th className="num">Fertility</th>
                <th className="num">If input</th>
                <th className="num">If output</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => (
                <tr key={`${row.slug}-${row.provider}`}>
                  <td>
                    <span className="model-name">{row.name}</span>
                    <span className="model-meta">
                      {row.lab}
                      {row.skipped ? ` · ${row.skipped}` : null}
                    </span>
                  </td>
                  <td className="num">{whole(row.nativeTokens)}</td>
                  <td className="num">{fert(row.fertility)}</td>
                  <td className="num true">{moneyFine(row.costIfInput)}</td>
                  <td className="num">{moneyFine(row.costIfOutput)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </form>
  );
}
