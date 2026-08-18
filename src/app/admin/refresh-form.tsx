"use client";

import { useActionState } from "react";
import { refreshCatalogAction, type ActionState } from "@/features/admin/actions";
import { ActionMessage, SubmitButton } from "@/shared/ui/form-status";

export function RefreshCatalogForm({ modelId }: { modelId?: string }) {
  const [state, action] = useActionState(refreshCatalogAction, null as ActionState | null);
  return (
    <form action={action} className="stack" style={{ margin: 0 }}>
      {modelId ? <input type="hidden" name="modelId" value={modelId} /> : null}
      <ActionMessage state={state} />
      <SubmitButton pendingLabel="Refreshing…">Refresh from models.dev</SubmitButton>
    </form>
  );
}
