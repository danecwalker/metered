"use client";

import { useActionState } from "react";
import { createAliasAction, deleteAliasAction, type ActionState } from "@/features/admin/actions";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";

export function AliasForm({
  providers,
}: {
  providers: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createAliasAction, null as ActionState | null);
  return (
    <form action={action} className="stack" style={{ maxWidth: 640 }}>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="kind">
            Kind
          </label>
          <select className="select" id="kind" name="kind" defaultValue="provider">
            <option value="provider">Provider / lab / harness</option>
            <option value="sku">SKU</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="source">
            From
          </label>
          <input className="input" id="source" name="source" required placeholder="qwen" />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="target">
          To (models.dev id)
        </label>
        <input
          className="input"
          id="target"
          name="target"
          required
          list="catalog-providers"
          placeholder="alibaba"
        />
        <datalist id="catalog-providers">
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </datalist>
        <p className="field__help">
          Provider remaps use a provider id. SKU remaps can be a bare id or{" "}
          <code>lab/model</code>.
        </p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="note">
          Note
        </label>
        <input className="input" id="note" name="note" placeholder="Qwen Code reports qwen" />
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save alias</SubmitButton>
    </form>
  );
}

export function DeleteAliasForm({ id }: { id: string }) {
  return (
    <form action={deleteAliasAction}>
      <input type="hidden" name="id" value={id} />
      <button className="btn btn--danger" type="submit">
        Remove
      </button>
    </form>
  );
}
