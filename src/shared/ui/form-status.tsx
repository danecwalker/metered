"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/features/admin/actions";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn--primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ActionMessage({ state }: { state: ActionState | null }) {
  if (!state) return null;
  if (!state.ok) {
    return (
      <p className="alert" role="alert">
        {state.error}
      </p>
    );
  }
  if (!state.message) return null;
  return (
    <p className="alert alert--ok" role="status">
      {state.message}
    </p>
  );
}
