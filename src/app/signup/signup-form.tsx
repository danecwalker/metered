"use client";

import { useActionState } from "react";
import { signupAction, type AccountState } from "@/features/account/actions";
import { SubmitButton } from "@/shared/ui/form-status";

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signupAction, null as AccountState | null);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label className="field__label" htmlFor="username">
          Username
        </label>
        <input className="input" id="username" name="username" autoComplete="username" required />
        <p className="field__help">Letters, numbers, underscore. 3-24 characters.</p>
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
          autoComplete="new-password"
          required
        />
        <p className="field__help">At least 10 characters.</p>
      </div>
      {state && !state.ok ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="btn btn--primary mt-1 w-full" pendingLabel="Creating…">
        Create account
      </SubmitButton>
    </form>
  );
}
