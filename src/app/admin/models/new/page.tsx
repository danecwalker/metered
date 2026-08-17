"use client";

import { useActionState, useState } from "react";
import { createModelAction, type ActionState } from "@/features/admin/actions";
import { slugify } from "@/features/admin/schemas";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";

export default function NewModelPage() {
  const [state, action] = useActionState(createModelAction, null as ActionState | null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <section className="wrap section" style={{ maxWidth: 640 }}>
      <h1 className="section__title">Add a model</h1>
      <p className="section__lede">
        A model is a tokenizer identity. Prices live on endpoints you add next.
      </p>
      <form action={action} className="stack">
        <div className="form-grid">
          <div className="field">
            <label className="field__label" htmlFor="name">
              Name
            </label>
            <input
              className="input"
              id="name"
              name="name"
              required
              onChange={(event) => {
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="lab">
              Lab
            </label>
            <input className="input" id="lab" name="lab" required placeholder="OpenAI" />
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label className="field__label" htmlFor="slug">
              Slug
            </label>
            <input
              className="input"
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tokenizerKey">
              Tokenizer
            </label>
            <select className="select" id="tokenizerKey" name="tokenizerKey" defaultValue="manual">
              <option value="o200k_base">o200k_base (OpenAI, local count)</option>
              <option value="cl100k_base">cl100k_base (legacy OpenAI, local count)</option>
              <option value="manual">Manual / lab API</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="status">
            Status
          </label>
          <select className="select" id="status" name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="notes">
            Notes
          </label>
          <textarea className="textarea" id="notes" name="notes" />
          <p className="field__help">Shown on the public model card.</p>
        </div>
        <ActionMessage state={state} />
        <SubmitButton pendingLabel="Saving…">Create model</SubmitButton>
      </form>
    </section>
  );
}
