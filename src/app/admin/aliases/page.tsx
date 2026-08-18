import { AdminNav } from "@/app/admin/admin-nav";
import { requireAdmin } from "@/features/admin/auth";
import { DEFAULT_PROVIDER_ALIASES } from "@/features/catalog/aliases";
import { loadCatalog } from "@/features/catalog/models-dev";
import { ensureReady } from "@/db/client";
import { catalogAliases } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AliasForm, DeleteAliasForm } from "./alias-forms";

export const dynamic = "force-dynamic";

export default async function AdminAliasesPage() {
  await requireAdmin();
  const db = await ensureReady();
  const [rows, catalog] = await Promise.all([
    db.select().from(catalogAliases).orderBy(desc(catalogAliases.createdAt)),
    loadCatalog(),
  ]);
  const providers = Object.values(catalog.providers)
    .map((provider) => ({ id: provider.id, name: provider.name }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <section className="wrap section">
      <AdminNav current="/admin/aliases" />
      <h1 className="section__title">Catalog aliases</h1>
      <p className="section__lede">
        Runs often say <code>qwen</code> or <code>kimi</code>. models.dev
        files those labs as <code>alibaba</code> and <code>moonshotai</code>.
        Built-in remaps always apply. Add extras when a SKU or provider name
        in a package does not match the catalog.
      </p>

      <h2 className="section__title">Built-in</h2>
      <div className="table-wrap">
        <table className="price-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DEFAULT_PROVIDER_ALIASES).map(([source, target]) => (
              <tr key={source}>
                <td>
                  <code>{source}</code>
                </td>
                <td>
                  <code>{target}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section__title" style={{ marginTop: "2.5rem" }}>
        Extra remaps
      </h2>
      {rows.length === 0 ? (
        <p className="model-meta">None yet. Add a SKU remap or a provider override.</p>
      ) : (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>From</th>
                <th>To</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="pill">{row.kind}</span>
                  </td>
                  <td>
                    <code>{row.source}</code>
                    {row.note ? <span className="model-meta">{row.note}</span> : null}
                  </td>
                  <td>
                    <code>{row.target}</code>
                  </td>
                  <td>
                    <DeleteAliasForm id={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section__title" style={{ marginTop: "2.5rem" }}>
        Add alias
      </h2>
      <AliasForm providers={providers} />
    </section>
  );
}
