"use client";

import { useActionState } from "react";
import {
  createEndpointAction,
  measureBasketAction,
  saveMeasurementAction,
  saveWorkRunAction,
  updateEndpointAction,
  updateModelAction,
  type ActionState,
} from "@/features/admin/actions";
import { SLICES } from "@/features/basket/slices";
import type { EndpointRow, HarnessRow, ModelRow, WorkRunRow } from "@/db/schema";
import type { SliceScore } from "@/features/catalog/queries";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";
import { fert, whole } from "@/shared/lib/format";

export function EditModelForm({ model }: { model: ModelRow }) {
  const [state, action] = useActionState(updateModelAction, null as ActionState | null);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={model.id} />
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="name">
            Name
          </label>
          <input className="input" id="name" name="name" required defaultValue={model.name} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="lab">
            Lab
          </label>
          <input className="input" id="lab" name="lab" required defaultValue={model.lab} />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="slug">
            Slug
          </label>
          <input className="input" id="slug" name="slug" required defaultValue={model.slug} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="tokenizerKey">
            Tokenizer
          </label>
          <select
            className="select"
            id="tokenizerKey"
            name="tokenizerKey"
            defaultValue={model.tokenizerKey}
          >
            <option value="o200k_base">o200k_base</option>
            <option value="cl100k_base">cl100k_base</option>
            <option value="manual">Manual / lab API</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="status">
          Status
        </label>
        <select className="select" id="status" name="status" defaultValue={model.status}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="notes">
          Notes
        </label>
        <textarea className="textarea" id="notes" name="notes" defaultValue={model.notes ?? ""} />
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save model</SubmitButton>
    </form>
  );
}

export function AddEndpointForm({ modelId }: { modelId: string }) {
  const [state, action] = useActionState(createEndpointAction, null as ActionState | null);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="modelId" value={modelId} />
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="provider">
            Provider
          </label>
          <input className="input" id="provider" name="provider" required placeholder="OpenAI" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="sku">
            SKU
          </label>
          <input className="input" id="sku" name="sku" required placeholder="gpt-5.4" />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="displayName">
          Display name
        </label>
        <input
          className="input"
          id="displayName"
          name="displayName"
          required
          placeholder="OpenAI first-party"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="listInput">
            List input ($/M native)
          </label>
          <input
            className="input"
            id="listInput"
            name="listInput"
            type="number"
            step="0.0001"
            min="0"
            required
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="listOutput">
            List output ($/M native)
          </label>
          <input className="input" id="listOutput" name="listOutput" type="number" step="0.0001" min="0" />
          <p className="field__help">Leave blank if unpublished.</p>
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="ep-status">
          Status
        </label>
        <select className="select" id="ep-status" name="status" defaultValue="published">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Adding…">Add endpoint</SubmitButton>
    </form>
  );
}

export function EndpointEditor({ endpoint }: { endpoint: EndpointRow }) {
  const [state, action] = useActionState(updateEndpointAction, null as ActionState | null);

  return (
    <form action={action} className="stack" style={{ paddingBlock: "1rem" }}>
      <input type="hidden" name="id" value={endpoint.id} />
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor={`provider-${endpoint.id}`}>
            Provider
          </label>
          <input
            className="input"
            id={`provider-${endpoint.id}`}
            name="provider"
            required
            defaultValue={endpoint.provider}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`sku-${endpoint.id}`}>
            SKU
          </label>
          <input
            className="input"
            id={`sku-${endpoint.id}`}
            name="sku"
            required
            defaultValue={endpoint.sku}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`display-${endpoint.id}`}>
          Display name
        </label>
        <input
          className="input"
          id={`display-${endpoint.id}`}
          name="displayName"
          required
          defaultValue={endpoint.displayName}
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor={`in-${endpoint.id}`}>
            List input
          </label>
          <input
            className="input"
            id={`in-${endpoint.id}`}
            name="listInput"
            type="number"
            step="0.0001"
            required
            defaultValue={endpoint.listInput}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`out-${endpoint.id}`}>
            List output
          </label>
          <input
            className="input"
            id={`out-${endpoint.id}`}
            name="listOutput"
            type="number"
            step="0.0001"
            defaultValue={endpoint.listOutput ?? ""}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`status-${endpoint.id}`}>
          Status
        </label>
        <select
          className="select"
          id={`status-${endpoint.id}`}
          name="status"
          defaultValue={endpoint.status}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save endpoint</SubmitButton>
    </form>
  );
}

export function MeasureForm({
  modelId,
  canLocalCount,
}: {
  modelId: string;
  canLocalCount: boolean;
}) {
  const [state, action] = useActionState(measureBasketAction, null as ActionState | null);
  if (!canLocalCount) return null;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="modelId" value={modelId} />
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Counting basket…">Count basket with local tokenizer</SubmitButton>
    </form>
  );
}

export function ManualCountForm({
  modelId,
  slices,
}: {
  modelId: string;
  slices: SliceScore[];
}) {
  const [state, action] = useActionState(saveMeasurementAction, null as ActionState | null);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="modelId" value={modelId} />
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="sliceId">
            Slice
          </label>
          <select className="select" id="sliceId" name="sliceId">
            {SLICES.map((slice) => (
              <option key={slice.id} value={slice.id}>
                {slice.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="nativeTokens">
            Native tokens
          </label>
          <input
            className="input"
            id="nativeTokens"
            name="nativeTokens"
            type="number"
            min="0"
            step="1"
            required
          />
        </div>
      </div>
      <p className="field__help">
        Character counts come from the frozen basket files
        {slices[0] ? ` (English is ${whole(slices[0].characters || 0)} chars once counted).` : "."}
      </p>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save slice count</SubmitButton>
      <p className="model-meta">
        Current fertilities:{" "}
        {slices
          .filter((slice) => slice.fertility != null)
          .map((slice) => `${slice.label} ${fert(slice.fertility)}`)
          .join(" · ") || "none yet"}
      </p>
    </form>
  );
}

export function WorkRunForm({
  modelId,
  harnesses,
  runs,
}: {
  modelId: string;
  harnesses: HarnessRow[];
  runs: (WorkRunRow & { harness: HarnessRow })[];
}) {
  const [state, action] = useActionState(saveWorkRunAction, null as ActionState | null);
  const latest = runs[0] ?? null;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="modelId" value={modelId} />
      <p className="field__help">
        One run per harness. GPT (ChatGPT), GPT (OpenCode), and GPT (API) are
        different rows. $ / M ET and a Stacks rank require every official task
        to pass. $ / pass still records a partial run; it does not sort the
        board. All tokens still count — retries and failed attempts stay in
        the bill. Manual numbers get a “manual” label. Thinking is billed as
        output.
      </p>
      {runs.length > 0 ? (
        <p className="model-meta">
          Logged:{" "}
          {runs
            .map((run) =>
              `${run.harness.name} · ${run.setting} · ${run.passed ?? "—"}/${run.tasks} passed`,
            )
            .join(" · ")}
        </p>
      ) : null}
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="harnessId">
            Harness
          </label>
          <select
            className="select"
            id="harnessId"
            name="harnessId"
            defaultValue={latest?.harnessId ?? "hrs_api"}
          >
            {harnesses.map((harness) => (
              <option key={harness.id} value={harness.id}>
                {harness.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="setting">
            Effort
          </label>
          <select className="select" id="setting" name="setting" defaultValue={latest?.setting ?? "default"}>
            <option value="default">Default</option>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="xhigh">Extra high</option>
            <option value="max">Max</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="tasks">
            Tasks run
          </label>
          <input
            className="input"
            id="tasks"
            name="tasks"
            type="number"
            min="1"
            required
            defaultValue={latest?.tasks ?? ""}
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="passed">
            Tasks passed
          </label>
          <input
            className="input"
            id="passed"
            name="passed"
            type="number"
            min="0"
            defaultValue={latest?.passed ?? ""}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="inputTokens">
            Input tokens
          </label>
          <input
            className="input"
            id="inputTokens"
            name="inputTokens"
            type="number"
            min="0"
            required
            defaultValue={latest?.inputTokens ?? ""}
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="outputTokens">
            Output tokens
          </label>
          <input
            className="input"
            id="outputTokens"
            name="outputTokens"
            type="number"
            min="0"
            required
            defaultValue={latest?.outputTokens ?? ""}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="reasoningTokens">
            Thinking tokens
          </label>
          <input
            className="input"
            id="reasoningTokens"
            name="reasoningTokens"
            type="number"
            min="0"
            defaultValue={latest?.reasoningTokens ?? 0}
          />
        </div>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="cacheHitTokens">
          Cache-hit tokens
        </label>
        <input
          className="input"
          id="cacheHitTokens"
          name="cacheHitTokens"
          type="number"
          min="0"
          defaultValue={latest?.cacheHitTokens ?? 0}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="work-notes">
          Notes
        </label>
        <textarea
          className="textarea"
          id="work-notes"
          name="notes"
          defaultValue={latest?.notes ?? ""}
        />
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Saving…">Save work run</SubmitButton>
    </form>
  );
}
