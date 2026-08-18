import { AdminNav } from "@/app/admin/admin-nav";
import { requireAdmin } from "@/features/admin/auth";
import {
  listSubmissions,
  publishSubmissionAction,
  rejectSubmissionAction,
  rescreenSubmissionAction,
  unpublishSubmissionAction,
} from "@/features/eval/actions";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  await requireAdmin();
  const rows = await listSubmissions();

  return (
    <section className="wrap section">
      <AdminNav current="/admin/submissions" />
      <h1 className="section__title">Screened packages</h1>
      <p className="section__lede">
        Nothing posts itself. The system blocks identity mismatches and
        low-reputation new SKUs. You can publish a blocked run anyway, or
        remove a published run from the index.
      </p>
      {rows.length === 0 ? (
        <p>No packages yet. They arrive from signed-in uploads at /eval.</p>
      ) : (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Stack</th>
                <th>User</th>
                <th>Screen</th>
                <th className="num">Passed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.modelName} ({row.harnessSlug})
                    <span className="model-meta">
                      {row.sku} / {row.setting}
                      {row.newModel ? " / new SKU" : ""}
                    </span>
                  </td>
                  <td>
                    {row.username ?? "-"}
                    <span className="model-meta">
                      rep {row.reputation ?? "-"}
                    </span>
                  </td>
                  <td>
                    <span className="pill">{row.status}</span>
                    <span className="model-meta">
                      {row.screen
                        ? `${row.screen.recommend}: ${row.screen.reasons.join(" ")}`
                        : row.reviewNote}
                    </span>
                  </td>
                  <td className="num">
                    {row.passed == null ? "-" : `${row.passed}/${row.tasks}`}
                  </td>
                  <td>
                    {row.status === "published" ? (
                      <form action={unpublishSubmissionAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="btn btn--danger" type="submit">
                          Remove from index
                        </button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {row.status === "rejected" ? (
                          <form action={rescreenSubmissionAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button className="btn" type="submit">
                              Re-screen
                            </button>
                          </form>
                        ) : null}
                        <form action={publishSubmissionAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn btn--primary" type="submit">
                            {row.status === "rejected" ? "Publish anyway" : "Publish"}
                          </button>
                        </form>
                        {row.status === "verified" ? (
                          <form action={rejectSubmissionAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button className="btn btn--danger" type="submit">
                              Reject
                            </button>
                          </form>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
