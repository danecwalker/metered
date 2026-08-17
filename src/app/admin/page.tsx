import Link from "next/link";
import { logoutAction } from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth";
import { listModelsAdmin } from "@/features/catalog/queries";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();
  const models = await listModelsAdmin();

  return (
    <section className="wrap section">
      <div className="admin-bar">
        <div>
          <h1 className="section__title">Models to price</h1>
          <p className="section__lede">
            Add a model, then add at least one endpoint and a basket count.
            Publish both to land it on the public index.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Link className="btn btn--primary" href="/admin/models/new">
            Add model
          </Link>
          <Link className="btn" href="/admin/submissions">
            Packages
          </Link>
          <form action={logoutAction}>
            <button className="btn btn--ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {models.length === 0 ? (
        <p>
          Nothing here yet. <Link href="/admin/models/new">Add the first model</Link>.
        </p>
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
                    <Link className="model-name" href={`/admin/models/${model.id}`}>
                      {model.name}
                    </Link>
                    <span className="model-meta">
                      {model.lab} · {model.slug}
                    </span>
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
