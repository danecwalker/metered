import Link from "next/link";
import { requireAdmin } from "@/features/admin/auth";
import {
  listSubmissions,
  publishSubmissionAction,
  rejectSubmissionAction,
} from "@/features/eval/actions";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  await requireAdmin();
  const rows = await listSubmissions();

  return (
    <section className="wrap section">
      <p className="model-meta">
        <Link href="/admin">All models</Link>
      </p>
      <h1 className="section__title">Eval packages</h1>
      <p className="section__lede">
        Suite-verified means hashes and totals checked out. Publishing writes a
        work run onto Stacks. It does not prove the API usage was honest —
        only that this file is a complete sealed run of our jobs.
      </p>
      {rows.length === 0 ? (
        <p>No packages yet. They arrive from /eval.</p>
      ) : (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Stack</th>
                <th>Status</th>
                <th className="num">Passed</th>
                <th>Integrity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.modelName} ({row.harnessSlug})
                    <span className="model-meta">
                      {row.provider} · {row.sku} · {row.setting}
                    </span>
                  </td>
                  <td>
                    <span className="pill">{row.status}</span>
                  </td>
                  <td className="num">
                    {row.passed == null ? "—" : `${row.passed}/${row.tasks}`}
                  </td>
                  <td>
                    <code>{row.integrity.slice(0, 12)}</code>
                  </td>
                  <td>
                    {row.status === "verified" ? (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <form action={publishSubmissionAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn btn--primary" type="submit">
                            Publish
                          </button>
                        </form>
                        <form action={rejectSubmissionAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn btn--danger" type="submit">
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : null}
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
