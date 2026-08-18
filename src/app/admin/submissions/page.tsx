import { AdminNav } from "@/app/admin/admin-nav";
import { requireAdmin } from "@/features/admin/auth";
import {
  listSubmissions,
  publishSubmissionAction,
  rejectSubmissionAction,
  rescreenSubmissionAction,
  setSubmissionProviderAction,
  unpublishSubmissionAction,
} from "@/features/eval/actions";
import { CatalogLogo } from "@/shared/ui/catalog-logo";
import { REPUTATION_AUTO_PUBLISH } from "@/features/account/reputation";
import { elapsed, whole } from "@/shared/lib/format";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  await requireAdmin();
  const rows = await listSubmissions();

  return (
    <section className="wrap section">
      <AdminNav current="/admin/submissions" />
      <h1 className="section__title">Screened packages</h1>
      <p className="section__lede">
        Reputation {REPUTATION_AUTO_PUBLISH}+ with a clean record publishes on submit. The system
        still blocks identity mismatches and low-reputation new SKUs. You
        can publish a held or blocked run, or pull a published run off the
        index. Provider is detected from the harness, API URL, or an explicit
        flag; you can override it on the row.
      </p>
      {rows.length === 0 ? (
        <p>No packages yet. They arrive from signed-in uploads at /eval.</p>
      ) : (
        <div className="package-list">
          {rows.map((row) => {
            const providerOptions = row.offerings;
            return (
              <article key={row.id} className="package-row">
                <div className="package-row__meta">
                  <div className="stack-lead">
                    <CatalogLogo kind="lab" id={row.labId} name={row.labName} />
                    <div className="stack-lead__text">
                      {row.modelName} ({row.harnessSlug})
                      <span className="model-meta">
                        {row.sku} / {row.setting}
                        {row.newModel ? " / new SKU" : ""}
                        {" · "}
                        {row.username ?? "-"} · rep {row.reputation ?? "-"}
                      </span>
                    </div>
                  </div>
                  <span className="package-row__screen">
                    <span className="pill">{row.status}</span>{" "}
                    {row.screen
                      ? `${row.screen.recommend}: ${row.screen.reasons.join(" ")}`
                      : row.reviewNote}
                  </span>
                  <p className="package-row__stats">
                    {row.passed == null ? "-" : `${row.passed}/${row.tasks}`} passed
                    {" · "}
                    {row.attempts != null ? `${whole(row.attempts)} attempts` : "no attempts"}
                    {" · "}
                    {elapsed(row.durationMs)}
                  </p>
                  <form action={setSubmissionProviderAction} className="package-row__provider">
                    <input type="hidden" name="id" value={row.id} />
                    <CatalogLogo kind="provider" id={row.providerId} name={row.providerName} />
                    <label className="sr-only" htmlFor={`provider-${row.id}`}>
                      Provider
                    </label>
                    <select
                      className="select"
                      id={`provider-${row.id}`}
                      name="providerId"
                      defaultValue={row.providerId}
                    >
                      {row.providerId &&
                      !providerOptions.some((item) => item.id === row.providerId) ? (
                        <option value={row.providerId}>{row.providerName}</option>
                      ) : null}
                      {providerOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn" type="submit">
                      Set provider
                    </button>
                  </form>
                </div>
                <div className="package-row__actions">
                  {row.status === "published" ? (
                    <form action={unpublishSubmissionAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <button className="btn btn--danger" type="submit">
                        Remove from index
                      </button>
                    </form>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
