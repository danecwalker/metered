import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteModelAction,
  deleteWorkRunAction,
} from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth";
import { getModelById, listHarnesses } from "@/features/catalog/queries";
import { loadCatalogLabs } from "@/features/catalog/sync";
import { canCount } from "@/features/measure/counters";
import { elapsed, fert } from "@/shared/lib/format";
import { RefreshCatalogForm } from "@/app/admin/refresh-form";
import { modelsDevUrl } from "@/features/catalog/resolve";
import { CatalogLogo } from "@/shared/ui/catalog-logo";
import {
  EditModelForm,
  EndpointList,
  ManualCountForm,
  MeasureForm,
  WorkRunForm,
} from "./model-forms";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminModelPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getModelById(id);
  if (!detail) notFound();

  const { model, endpoints, slices, composite, workRuns } = detail;
  const [harnessList, labs] = await Promise.all([listHarnesses(), loadCatalogLabs()]);

  return (
    <section className="wrap section stack">
      <p className="model-meta">
        <Link href="/admin">All models</Link>
        {" / "}
        <Link href={`/models/${model.slug}`}>Public card</Link>
      </p>
      <div className="model-title">
        <CatalogLogo kind="lab" id={model.labId} name={model.lab} size={28} />
        <h1 className="section__title" style={{ margin: 0 }}>
          {model.name}
        </h1>
      </div>
      <p>
        Composite fertility {fert(composite.fertility)} / {slices.filter((s) => s.fertility).length}{" "}
        of {slices.length} slices measured
        {model.catalogId ? (
          <>
            {" · "}
            <a href={modelsDevUrl(model.catalogId)}>models.dev</a>
          </>
        ) : null}
      </p>
      <RefreshCatalogForm modelId={model.id} />

      <EditModelForm model={model} labs={labs} />

      <h2 className="section__title">Basket counts</h2>
      <p className="field__help">
        <Link href="/admin/basket">Bulk import</Link> the JSON from{" "}
        <code>npm run count:basket</code>, or count one slice below.
      </p>
      <MeasureForm modelId={model.id} canLocalCount={canCount(model.tokenizerKey)} />
      <ManualCountForm modelId={model.id} slices={slices} />

      <h2 className="section__title">Work run</h2>
      {workRuns.length > 0 ? (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Harness</th>
                <th>Effort</th>
                <th className="num">Passed</th>
                <th className="num">Attempts</th>
                <th className="num">Time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {workRuns.map((run) => (
                <tr key={run.id}>
                  <td>{run.harness.name}</td>
                  <td>{run.setting}</td>
                  <td className="num">
                    {run.passed == null ? "-" : `${run.passed}/${run.tasks}`}
                  </td>
                  <td className="num">{run.attempts ?? "-"}</td>
                  <td className="num tnum">{elapsed(run.durationMs)}</td>
                  <td>
                    <form action={deleteWorkRunAction}>
                      <input type="hidden" name="id" value={run.id} />
                      <button className="btn btn--danger" type="submit">
                        Remove run
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <WorkRunForm modelId={model.id} harnesses={harnessList} runs={workRuns} />

      <h2 className="section__title">Endpoints</h2>
      <p className="field__help">
        Every models.dev provider for this lab model. First-party and the
        provider on a published run are live. The rest stay draft until you
        publish them.
      </p>
      <EndpointList endpoints={endpoints} />

      <form action={deleteModelAction} style={{ borderTop: "1px solid var(--color-rule)", paddingTop: "1.5rem" }}>
        <input type="hidden" name="id" value={model.id} />
        <button className="btn btn--danger" type="submit">
          Delete model
        </button>
      </form>
    </section>
  );
}
