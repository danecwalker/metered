import Link from "next/link";
import type { IndexRow } from "@/features/catalog/queries";
import { fert, money, moneyFine, whole } from "@/shared/lib/format";

export function hasEffectivePerMillion(rows: IndexRow[]): boolean {
  return rows.some((row) => row.work?.effectivePerMillion != null);
}

export function IndexTable({ rows }: { rows: IndexRow[] }) {
  if (rows.length === 0) {
    return (
      <p>
        No published endpoints yet. Add a model in{" "}
        <Link href="/admin">admin</Link>.
      </p>
    );
  }

  const hasEt = hasEffectivePerMillion(rows);

  return (
    <div className="table-wrap">
      <table className={hasEt ? "price-table" : "stack-table"}>
        <caption className={hasEt ? "sr-only" : undefined}>
          {hasEt
            ? "Effective token price, cost per pass, and pass rate for published stacks"
            : "Published stacks, not a cost ranking. Pass counts stay on every row. $ / M ET exists only after every official task passed."}
        </caption>
        <thead>
          <tr>
            <th>Model</th>
            <th className="num">Passed</th>
            {hasEt ? (
              <>
                <th className="num">$ / M ET</th>
                <th className="num">$ / pass</th>
                <th className="num">Tokens / pass</th>
                <th className="num">Burn vs leanest</th>
                <th className="num">Encoding</th>
                <th className="num">Sticker in</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.endpointId}:${row.harnessId ?? "none"}:${row.work?.setting ?? "none"}`}>
              <td>
                <Link className="model-name" href={`/models/${row.slug}`}>
                  {row.stack}
                </Link>
                <span className="model-meta">
                  {row.lab}
                  {row.harnessName ? ` · ${row.harnessName}` : ""}
                  {row.work?.setting && row.work.setting !== "default"
                    ? ` · ${row.work.setting}`
                    : ""}
                  {` · ${row.displayName}`}
                  {row.estimateSlices > 0 ? (
                    <>
                      {" "}
                      <span className="pill pill--est">estimate</span>
                    </>
                  ) : null}
                  {row.work?.source === "manual" ? (
                    <>
                      {" "}
                      <span className="pill">manual</span>
                    </>
                  ) : null}
                  {row.work && !row.work.complete && row.work.passed != null ? (
                    <>
                      {" "}
                      <span className="pill">incomplete</span>
                    </>
                  ) : null}
                </span>
              </td>
              <td className="num">
                {row.work?.passed == null ? "—" : `${row.work.passed}/${row.work.tasks}`}
              </td>
              {hasEt ? (
                <>
                  <td className={row.work?.effectivePerMillion == null ? "num" : "num true"}>
                    {money(row.work?.effectivePerMillion)}
                  </td>
                  <td className="num">{moneyFine(row.work?.costPerPass)}</td>
                  <td className="num">
                    {row.work?.tokensPerPass == null
                      ? "—"
                      : whole(Math.round(row.work.tokensPerPass))}
                  </td>
                  <td className="num">{fert(row.work?.tokenEfficiency)}</td>
                  <td className="num" title="Tokenizer fertility on the text basket">
                    {fert(row.fertilityIn)}
                  </td>
                  <td className="num sticker">{money(row.listInput)}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {!hasEt ? (
        <p className="model-meta" style={{ padding: "0.85rem 1rem 0.95rem" }}>
          Coverage stays on the row. List price and $ / M ET stay off this
          table until a complete official suite exists. Incomplete runs stay
          visible but do not rank.
        </p>
      ) : null}
    </div>
  );
}
