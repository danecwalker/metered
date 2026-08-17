"use client";

import { useActionState } from "react";
import { submitPackageAction, type SubmitState } from "@/features/eval/actions";
import { SubmitButton } from "@/shared/ui/form-status";

export function SubmitPackageForm() {
  const [state, action] = useActionState(submitPackageAction, {} as SubmitState);

  return (
    <form action={action} className="stack">
      <div className="field">
        <label className="field__label" htmlFor="package">
          Sealed package
        </label>
        <textarea
          className="textarea"
          id="package"
          name="package"
          required
          spellCheck={false}
          placeholder='{"format":"metered-eval/1",…}'
        />
        <p className="field__help">
          A <code>metered-eval/1</code> file from the local CLI. We re-hash the
          official prompts and re-score the stored outputs.
        </p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="package-file">
          Or upload a file
        </label>
        <input
          className="input"
          id="package-file"
          type="file"
          accept="application/json,.json,.metered.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const box = document.getElementById("package") as HTMLTextAreaElement | null;
            if (box) box.value = text;
          }}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="note">
          Note (optional)
        </label>
        <input className="input" id="note" name="note" />
      </div>
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
      <SubmitButton pendingLabel="Checking…">Verify and submit</SubmitButton>
    </form>
  );
}
