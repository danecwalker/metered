import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import {
  hasDollarsPerMu,
  type IndexRow,
} from "@/features/catalog/types";
import { fert, money, moneyFine, whole } from "@/shared/lib/format";

function statusOf(row: IndexRow) {
  if (!row.work) return "none" as const;
  if (row.work.complete) return "complete" as const;
  return "incomplete" as const;
}

function StatusMark({ row }: { row: IndexRow }) {
  const status = statusOf(row);
  if (status === "complete") {
    return (
      <span className="border-rule inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.68rem] tracking-wide">
        <CircleCheck className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        complete
      </span>
    );
  }
  if (status === "incomplete") {
    return (
      <span className="border-rule inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.68rem] tracking-wide">
        <CircleAlert className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        incomplete
      </span>
    );
  }
  return <span className="text-muted text-xs">no official run</span>;
}

export function IndexTable({
  rows,
  variant = "preview",
}: {
  rows: IndexRow[];
  variant?: "preview" | "full";
}) {
  if (rows.length === 0) {
    return (
      <p className="text-ink-2">
        No official runs yet.{" "}
        <Link className="hover:text-accent" href="/eval">
          Run an eval
        </Link>{" "}
        to put a stack on the board.
      </p>
    );
  }

  const hasEt = hasDollarsPerMu(rows);
  const full = variant === "full";

  return (
    <div className="table-wrap">
      <table className={hasEt || full ? "price-table" : "stack-table"}>
        <caption className={hasEt && !full ? "sr-only" : undefined}>
          {full
            ? "Official runs: model, harness, endpoint"
            : hasEt
              ? "Dollars per Metered Unit, cost per pass, and pass rate for finished stacks"
              : "Stacks with an official run. Pass counts stay on every row."}
        </caption>
        <thead>
          <tr>
            <th>Stack</th>
            {full ? (
              <>
                <th>Lab</th>
                <th>Harness</th>
                <th>Effort</th>
                <th>Endpoint</th>
              </>
            ) : null}
            <th className="num">Passed</th>
            {full ? <th>Status</th> : null}
            {hasEt || full ? (
              <>
                <th className="num">$ / MU</th>
                <th className="num">$ / pass</th>
                <th className="num">Tokens / pass</th>
                <th className="num">Burn vs leanest</th>
                <th className="num">Encoding</th>
                <th className="num">Sticker in</th>
                {full ? <th className="num">Sticker out</th> : null}
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.endpointId}:${row.harnessId ?? "none"}:${row.work?.setting ?? "none"}`}
            >
              <td>
                <Link className="model-name" href={`/models/${row.slug}`}>
                  {full ? row.name : row.stack}
                </Link>
                <span className="model-meta">
                  {full ? (
                    row.sku
                  ) : (
                    <>
                      {row.lab}
                      {row.harnessName ? `, ${row.harnessName}` : ""}
                      {row.work?.setting && row.work.setting !== "default"
                        ? `, ${row.work.setting}`
                        : ""}
                      {`, ${row.displayName}`}
                    </>
                  )}
                </span>
              </td>
              {full ? (
                <>
                  <td>{row.lab}</td>
                  <td>{row.harnessName ?? "-"}</td>
                  <td>{row.work?.setting ?? "-"}</td>
                  <td>{row.displayName}</td>
                </>
              ) : null}
              <td className="num">
                {row.work?.passed != null
                  ? `${row.work.passed}/${row.work.tasks}`
                  : "-"}
              </td>
              {full ? (
                <td>
                  <StatusMark row={row} />
                </td>
              ) : null}
              {hasEt || full ? (
                <>
                  <td
                    className={
                      row.work?.dollarsPerMu == null ? "num" : "num true"
                    }
                  >
                    {moneyFine(row.work?.dollarsPerMu)}
                  </td>
                  <td className="num">{moneyFine(row.work?.costPerPass)}</td>
                  <td className="num">
                    {row.work?.tokensPerPass == null
                      ? "-"
                      : whole(Math.round(row.work.tokensPerPass))}
                  </td>
                  <td className="num">{fert(row.work?.tokenEfficiency)}</td>
                  <td className="num" title="Tokenizer fertility on the text basket">
                    {fert(row.fertilityIn)}
                  </td>
                  <td className="num sticker">{money(row.listInput)}</td>
                  {full ? (
                    <td className="num sticker">{money(row.listOutput)}</td>
                  ) : null}
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
