"use client";

import { FileJson, Upload } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { submitPackageAction, type SubmitState } from "@/features/eval/actions";
import { SubmitButton } from "@/shared/ui/form-status";

function isPackageFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".json") ||
    name.endsWith(".metered.json") ||
    file.type === "application/json" ||
    file.type === ""
  );
}

export function SubmitPackageForm() {
  const [state, action] = useActionState(submitPackageAction, {} as SubmitState);
  const [payload, setPayload] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropId = useId();

  async function takeFile(file: File) {
    if (!isPackageFile(file)) {
      setLoadError("Use a .json or .metered.json sealed package.");
      return;
    }
    const text = await file.text();
    setPayload(text);
    setFilename(file.name);
    setLoadError(null);
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="package" value={payload} />
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
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void takeFile(file);
        }}
        className={[
          "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center",
          "transition-[border-color,background-color] duration-150",
          dragging
            ? "border-accent bg-paper-3"
            : "border-rule-2 bg-paper-2 hover:border-rule hover:bg-paper-3",
        ].join(" ")}
        aria-label="Upload a sealed package. Drop a file or click to choose."
      >
        {filename ? (
          <FileJson className="text-ink size-8" strokeWidth={1.5} aria-hidden />
        ) : (
          <Upload className="text-muted size-8" strokeWidth={1.5} aria-hidden />
        )}
        <p className="text-ink m-0 text-sm font-medium">
          {filename ? filename : "Drop a sealed package"}
        </p>
        <p className="text-muted m-0 text-sm">
          {filename
            ? "Drop another file to replace it, or click to choose."
            : ".json or .metered.json, or click to choose"}
        </p>
      </div>
      <input
        ref={fileRef}
        className="sr-only"
        id="package-file"
        type="file"
        accept="application/json,.json,.metered.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void takeFile(file);
          event.target.value = "";
        }}
      />

      <div className="grid gap-1.5">
        <label className="text-ink text-sm font-medium" htmlFor="note">
          Note (optional)
        </label>
        <input
          className="bg-paper-3 text-ink border-rule-2 focus-visible:outline-focus min-h-11 rounded-md border px-3.5 text-base"
          id="note"
          name="note"
        />
      </div>

      {loadError ? (
        <p className="alert" role="alert">
          {loadError}
        </p>
      ) : null}
      {state.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="alert alert--ok" role="status">
          Suite-verified and queued. An admin still has to publish it to
          Stacks. Id {state.id}.
        </p>
      ) : null}

      <SubmitButton
        pendingLabel="Checking…"
        className="bg-accent text-accent-ink hover:text-accent-ink inline-flex min-h-11 w-fit cursor-pointer items-center justify-center gap-1.5 rounded-full border border-transparent px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        Verify and submit
      </SubmitButton>
    </form>
  );
}
