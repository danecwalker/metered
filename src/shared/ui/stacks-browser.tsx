"use client";

import { CircleAlert, CircleCheck, Layers, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { IndexRow } from "@/features/catalog/types";
import { IndexTable } from "@/shared/ui/index-table";

type StatusFilter = "all" | "complete" | "incomplete";

function rowStatus(row: IndexRow): Exclude<StatusFilter, "all"> {
  return row.work?.complete ? "complete" : "incomplete";
}

function matchesQuery(row: IndexRow, query: string) {
  if (!query) return true;
  const hay = [
    row.stack,
    row.lab,
    row.harnessName,
    row.provider,
    row.sku,
    row.displayName,
    row.work?.setting,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function chipClass(active: boolean) {
  return [
    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
    active
      ? "border-rule-2 bg-paper-3 text-ink"
      : "border-rule bg-transparent text-ink-2 hover:text-ink",
  ].join(" ");
}

export function StacksBrowser({ rows }: { rows: IndexRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (status !== "all" && rowStatus(row) !== status) return false;
        return matchesQuery(row, needle);
      }),
    [needle, rows, status],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="bg-paper-2 border-rule text-muted flex min-h-10 min-w-[16rem] flex-1 items-center gap-2 rounded-full border px-3.5">
          <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <input
            className="text-ink placeholder:text-muted min-h-9 w-full min-w-0 border-0 bg-transparent text-sm outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by model, harness, lab, SKU"
            aria-label="Filter stacks"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
          <button
            type="button"
            className={chipClass(status === "all")}
            aria-pressed={status === "all"}
            onClick={() => setStatus("all")}
          >
            <Layers className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            All
          </button>
          <button
            type="button"
            className={chipClass(status === "complete")}
            aria-pressed={status === "complete"}
            onClick={() => setStatus("complete")}
          >
            <CircleCheck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Complete
          </button>
          <button
            type="button"
            className={chipClass(status === "incomplete")}
            aria-pressed={status === "incomplete"}
            onClick={() => setStatus("incomplete")}
          >
            <CircleAlert className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Incomplete
          </button>
        </div>
        <p className="text-muted text-xs">
          {filtered.length} of {rows.length}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="text-ink-2">No stacks match that filter.</p>
      ) : (
        <IndexTable rows={filtered} variant="full" />
      )}
    </>
  );
}
