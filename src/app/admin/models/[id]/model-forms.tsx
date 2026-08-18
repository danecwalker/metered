"use client";

import { useActionState } from "react";
import {
  deleteEndpointAction,
  measureBasketAction,
  saveMeasurementAction,
  saveWorkRunAction,
  updateEndpointAction,
  updateEndpointStatusAction,
  updateModelAction,
  type ActionState,
} from "@/features/admin/actions";
import { SLICES } from "@/features/basket/slices";
import type { EndpointRow, HarnessRow, ModelRow, WorkRunRow } from "@/db/schema";
import type { CatalogLab } from "@/features/catalog/resolve";
import type { SliceScore } from "@/features/catalog/queries";
import { CatalogLogo } from "@/shared/ui/catalog-logo";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";
import { fert, money, whole } from "@/shared/lib/format";

export function EditModelForm({
  model,
  labs,
}: {
  model: ModelRow;
  labs: CatalogLab[];
}) {
  const [state, action] = useActionState(updateModelAction, null as ActionState | null);
  const locked = Boolean(model.catalogId);
  const selectedLab = model.labId ?? "";

  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={model.id} />
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
            defaultValue={model.name}
            readOnly={locked}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="labId">
            Lab
          </label>
          {labs.length > 0 ? (
            <select className="select" id="labId" name="labId" defaultValue={selectedLab}>
              <option value="">Pick a lab</option>
              {selectedLab && !labs.some((lab) => lab.id === selectedLab) ? (
                <option value={selectedLab}>{model.lab}</option>
              ) : null}
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          ) : (
            <input className="input" id="lab" name="lab" required defaultValue={model.lab} />
          )}
          <p className="field__help">
            Lab is the models.dev lab, not a host. Changing it reloads every
            provider as an endpoint.
          </p>
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
            defaultValue={model.slug}
            readOnly={locked}
          />
          {locked && model.catalogId ? (
            <p className="field__help">
              Identity comes from models.dev (<code>{model.catalogId}</code>).
            </p>
          ) : null}
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

export function EndpointList({ endpoints }: { endpoints: EndpointRow[] }) {
  if (endpoints.length === 0) {
    return <p>No providers yet. Refresh from models.dev.</p>;
  }
  return (
    <div className="table-wrap">
      <table className="price-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>SKU</th>
            <th className="num">In</th>
            <th className="num">Out</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {endpoints.map((endpoint) => (
            <tr key={endpoint.id}>
              <td>
                <div className="stack-lead">
                  <CatalogLogo kind="provider" id={endpoint.providerId} name={endpoint.provider} />
                  <div className="stack-lead__text">
                    {endpoint.displayName}
                  </div>
                </div>
              </td>
              <td>
                <code>{endpoint.sku}</code>
              </td>
              <td className="num">{money(endpoint.listInput)}</td>
              <td className="num">{money(endpoint.listOutput)}</td>
              <td>
                <EndpointStatusForm endpoint={endpoint} />
              </td>
              <td>
                <form action={deleteEndpointAction}>
                  <input type="hidden" name="id" value={endpoint.id} />
                  <button className="btn btn--danger" type="submit">
                    Remove
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointStatusForm({ endpoint }: { endpoint: EndpointRow }) {
  return (
    <form action={updateEndpointStatusAction}>
      <input type="hidden" name="id" value={endpoint.id} />
      <input type="hidden" name="provider" value={endpoint.provider} />
      <input type="hidden" name="sku" value={endpoint.sku} />
      <input type="hidden" name="displayName" value={endpoint.displayName} />
      <input type="hidden" name="listInput" value={endpoint.listInput} />
      <input type="hidden" name="listOutput" value={endpoint.listOutput ?? ""} />
      <input type="hidden" name="listCacheHit" value={endpoint.listCacheHit ?? ""} />
      <input type="hidden" name="listCacheWrite" value={endpoint.listCacheWrite ?? ""} />
      <select
        className="select"
        name="status"
        defaultValue={endpoint.status}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
    </form>
  );
}

export function EndpointEditor({ endpoint }: { endpoint: EndpointRow }) {
  const [state, action] = useActionState(updateEndpointAction, null as ActionState | null);
  const locked = Boolean(endpoint.catalogSku || endpoint.providerId);

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
            readOnly={locked}
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
            readOnly={locked}
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
          readOnly={locked}
        />
        {locked ? (
          <p className="field__help">List prices refresh from models.dev. Status stays yours.</p>
        ) : null}
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
            readOnly={locked}
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
            readOnly={locked}
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor={`cache-hit-${endpoint.id}`}>
            List cache hit
          </label>
          <input
            className="input"
            id={`cache-hit-${endpoint.id}`}
            name="listCacheHit"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={endpoint.listCacheHit ?? ""}
            readOnly={locked}
          />
          <p className="field__help">Leave blank to bill cache at the input rate.</p>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`cache-write-${endpoint.id}`}>
            List cache write
          </label>
          <input
            className="input"
            id={`cache-write-${endpoint.id}`}
            name="listCacheWrite"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={endpoint.listCacheWrite ?? ""}
            readOnly={locked}
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
          .join(", ") || "none yet"}
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
        different rows. $ / MU and a Stacks rank require every official task
        to pass. $ / pass still records a partial run; it does not sort the
        board. All tokens still count. Retries and failed attempts stay in
        the bill. Manual numbers get a “manual” label. Thinking is billed as
        output. Cache reads and writes are billed at their list rates, or the
        input rate if those rates are empty.
      </p>
      {runs.length > 0 ? (
        <p className="model-meta">
          Logged:{" "}
          {runs
            .map((run) =>
              `${run.harness.name} / ${run.setting} / ${run.passed ?? "-"}/${run.tasks} passed`,
            )
            .join(", ")}
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
      <div className="form-grid">
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
          <label className="field__label" htmlFor="cacheWriteTokens">
            Cache-write tokens
          </label>
          <input
            className="input"
            id="cacheWriteTokens"
            name="cacheWriteTokens"
            type="number"
            min="0"
            defaultValue={latest?.cacheWriteTokens ?? 0}
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="attempts">
            Attempts
          </label>
          <input
            className="input"
            id="attempts"
            name="attempts"
            type="number"
            min="1"
            defaultValue={latest?.attempts ?? ""}
          />
          <p className="field__help">Harness calls, including retries.</p>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="durationSec">
            Time (seconds)
          </label>
          <input
            className="input"
            id="durationSec"
            name="durationSec"
            type="number"
            min="0"
            defaultValue={
              latest?.durationMs != null ? Math.round(latest.durationMs / 1000) : ""
            }
          />
        </div>
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
