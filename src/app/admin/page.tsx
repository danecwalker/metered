import Link from "next/link";
import { AdminNav } from "@/app/admin/admin-nav";
import { requireAdmin } from "@/features/admin/auth";
import { listModelsAdmin } from "@/features/catalog/queries";
import { CatalogLogo } from "@/shared/ui/catalog-logo";
import { RefreshCatalogForm } from "./refresh-form";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();
  const models = await listModelsAdmin();

  return (
    <section className="wrap section">
      <AdminNav current="/admin" />
      <div className="admin-bar">
        <h1 className="section__title">Models to price</h1>
        <RefreshCatalogForm />
      </div>
      <p className="section__lede">
        Models and endpoints come from{" "}
        <a href="https://models.dev">models.dev</a> when a run lands. Map
        harness names on{" "}
        <Link href="/admin/aliases">Aliases</Link> (qwen → alibaba). Publish
        a package to put a stack on the board.
      </p>

      {models.length === 0 ? (
        <p>Nothing here yet. Publish a screened package to open the first model.</p>
      ) : (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Tokenizer</th>
                <th>Status</th>
                <th className="num">Endpoints</th>
                <th className="num">Slices</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id}>
                  <td>
                    <div className="stack-lead">
                      <CatalogLogo kind="lab" id={model.labId} name={model.lab} />
                      <div className="stack-lead__text">
                        <Link className="model-name" href={`/admin/models/${model.id}`}>
                          {model.name}
                        </Link>
                        <span className="model-meta">
                          {model.lab} / {model.slug}
                          {model.catalogId ? ` / ${model.catalogId}` : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code>{model.tokenizerKey}</code>
                  </td>
                  <td>
                    <span className="pill">{model.status}</span>
                  </td>
                  <td className="num">{model.endpointCount}</td>
                  <td className="num">{model.measuredSlices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
