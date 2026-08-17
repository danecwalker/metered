import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelBySlug } from "@/features/catalog/queries";
import { loadOfficialSuite } from "@/features/eval/suite";
import { stackLabel } from "@/features/harness/catalog";
import {
  dollarsPerMillionEt,
  runIsComplete,
  tokensPerPass,
  workCostUsd,
  workPricePerPass,
} from "@/features/pricing/math";
import { fert, money, moneyFine, whole } from "@/shared/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getModelBySlug(slug);
  if (!detail) return { title: "Model" };
  return { title: detail.model.name };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const detail = await getModelBySlug(slug);
  if (!detail) notFound();

  const { model, endpoints, slices, composite, workRuns } = detail;
  const published = endpoints.filter((row) => row.status === "published");
  const suite = await loadOfficialSuite();

  return (
    <article className="wrap section">
      <p className="model-meta">
        {model.lab} · {model.tokenizerKey}
      </p>
      <h1 className="section__title">{model.name}</h1>
      {model.notes ? <p className="section__lede">{model.notes}</p> : null}

      <p>Encoding fertility {fert(composite.fertility)}</p>

      {workRuns.length > 0 ? (
        <>
          <h2 className="section__title" style={{ marginTop: "3rem" }}>
            Harnesses
          </h2>
          <p className="model-meta" style={{ marginBottom: "0.8rem" }}>
            Same model, different drivers. ChatGPT is not OpenCode. $ / M ET
            is only set when every official task passed. $ / pass still
            shows on a partial run; it does not rank the index.
          </p>
          <div className="table-wrap">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Stack</th>
                  <th className="num">Passed</th>
                  <th className="num">$ / M ET</th>
                  <th className="num">Tokens / pass</th>
                  {published.map((endpoint) => (
                    <th key={endpoint.id} className="num">
                      $ / {endpoint.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workRuns.map((run) => {
                  const tpp = tokensPerPass(
                    run.inputTokens,
                    run.outputTokens,
                    run.reasoningTokens,
                    run.passed,
                  );
                  const complete = runIsComplete(
                    run.passed,
                    run.tasks,
                    suite.tasks.length,
                  );
                  const etFor = (endpoint: (typeof published)[number]) => {
                    const total = workCostUsd({
                      inputTokens: run.inputTokens,
                      outputTokens: run.outputTokens,
                      reasoningTokens: run.reasoningTokens,
                      cacheHitTokens: run.cacheHitTokens,
                      listInput: endpoint.listInput,
                      listOutput: endpoint.listOutput,
                      listCacheHit: endpoint.listCacheHit,
                    });
                    const perPass =
                      total == null ? null : workPricePerPass(total, run.passed);
                    const et =
                      complete && total != null
                        ? dollarsPerMillionEt(total, suite.workMu)
                        : null;
                    return { perPass, et };
                  };
                  const headline = published[0] ? etFor(published[0]) : { perPass: null, et: null };
                  return (
                    <tr key={run.id}>
                      <td>
                        {stackLabel(model.name, run.harness.name)}
                        <span className="model-meta">{run.setting}</span>
                      </td>
                      <td className="num">
                        {run.passed == null ? "—" : `${run.passed}/${run.tasks}`}
                      </td>
                      <td className="num true">{money(headline.et)}</td>
                      <td className="num">
                        {tpp == null ? "—" : whole(Math.round(tpp))}
                      </td>
                      {published.map((endpoint) => {
                        const { perPass } = etFor(endpoint);
                        return (
                          <td key={endpoint.id} className="num">
                            {moneyFine(perPass)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="table-wrap" style={{ marginTop: "2rem" }}>
        <table className="price-table">
          <thead>
            <tr>
              <th>Slice</th>
              <th className="num">Characters</th>
              <th className="num">Native tokens</th>
              <th className="num">Fertility</th>
              <th className="num">True in</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.sliceId}>
                <td>{slice.label}</td>
                <td className="num">{slice.fertility == null ? "—" : whole(slice.characters)}</td>
                <td className="num">
                  {slice.fertility == null ? "—" : whole(slice.nativeTokens)}
                </td>
                <td className="num">{fert(slice.fertility)}</td>
                <td className="num true">{money(slice.trueInput)}</td>
                <td>
                  {slice.fertility == null ? (
                    "—"
                  ) : (
                    <span className={slice.source === "estimate" ? "pill pill--est" : "pill"}>
                      {slice.source}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section__title" style={{ marginTop: "3rem" }}>
        Endpoints
      </h2>
      {published.length === 0 ? (
        <p>No published endpoints.</p>
      ) : (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>SKU</th>
                <th className="num">List in</th>
                <th className="num">List out</th>
              </tr>
            </thead>
            <tbody>
              {published.map((endpoint) => (
                <tr key={endpoint.id}>
                  <td>{endpoint.displayName}</td>
                  <td>
                    <code>{endpoint.sku}</code>
                  </td>
                  <td className="num">{money(endpoint.listInput)}</td>
                  <td className="num">{money(endpoint.listOutput)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/">Back to the index</Link>
      </p>
    </article>
  );
}
