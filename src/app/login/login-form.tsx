"use client";

import { useActionState } from "react";
import { loginAction, type AccountState } from "@/features/account/actions";
import { SubmitButton } from "@/shared/ui/form-status";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, null as AccountState | null);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label className="field__label" htmlFor="username">
          Username
        </label>
        <input className="input" id="username" name="username" autoComplete="username" required />
      </div>
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
      </div>
      {state && !state.ok ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="btn btn--primary mt-1 w-full" pendingLabel="Checking…">
        Sign in
      </SubmitButton>
    </form>
  );
}
