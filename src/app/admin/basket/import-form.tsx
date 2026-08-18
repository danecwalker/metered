"use client";

import { useActionState, useId, useRef, useState } from "react";
import { importBasketCountsAction, type ActionState } from "@/features/admin/actions";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";

export function ImportBasketForm() {
  const [state, action] = useActionState(importBasketCountsAction, null as ActionState | null);
  const [payload, setPayload] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropId = useId();

  async function takeFile(file: File) {
    setPayload(await file.text());
    setFilename(file.name);
  }

  return (
    <form action={action} className="stack" style={{ maxWidth: 720 }}>
      <input type="hidden" name="payload" value={payload} />
      <div
        id={dropId}
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) void takeFile(file);
        }}
        className="textarea"
        style={{
          display: "flex",
          minHeight: "6rem",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        {filename ? filename : "Drop basket-counts.json, or click to choose"}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void takeFile(file);
        }}
      />
      <div className="field">
        <label className="field__label" htmlFor="payload-text">
          Or paste the JSON
        </label>
        <textarea
          className="textarea"
          id="payload-text"
          rows={12}
          value={payload}
          onChange={(event) => {
            setPayload(event.target.value);
            setFilename(null);
          }}
          spellCheck={false}
        />
      </div>
      <ActionMessage state={state} />
      <div className="form-grid">
        <SubmitButton pendingLabel="Checking…">Preview matches</SubmitButton>
        <SubmitButton name="mode" value="apply" pendingLabel="Writing…" className="btn">
          Write counts
        </SubmitButton>
      </div>
    </form>
  );
}
