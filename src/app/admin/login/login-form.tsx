"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type ActionState } from "@/features/admin/actions";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";

export function AdminLoginForm() {
  const search = useSearchParams();
  const [state, action] = useActionState(loginAction, null as ActionState | null);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={search.get("next") ?? "/admin"} />
      <div className="field">
        <label className="field__label" htmlFor="password">
          Password
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <p className="field__help">Set in ADMIN_PASSWORD.</p>
      </div>
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Checking…">Sign in</SubmitButton>
    </form>
  );
}
