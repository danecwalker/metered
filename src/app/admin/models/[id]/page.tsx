import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEndpointAction, deleteModelAction } from "@/features/admin/actions";
import { requireAdmin } from "@/features/admin/auth";
import { getModelById, listHarnesses } from "@/features/catalog/queries";
import { canCount } from "@/features/measure/counters";
import { fert } from "@/shared/lib/format";
import {
  AddEndpointForm,
  EditModelForm,
  EndpointEditor,
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
  const harnessList = await listHarnesses();

  return (
    <section className="wrap section stack">
      <p className="model-meta">
        <Link href="/admin">All models</Link>
        {" · "}
        <Link href={`/models/${model.slug}`}>Public card</Link>
      </p>
      <h1 className="section__title">{model.name}</h1>
      <p>
        Composite fertility {fert(composite.fertility)} · {slices.filter((s) => s.fertility).length}{" "}
        of {slices.length} slices measured
      </p>

      <EditModelForm model={model} />

      <h2 className="section__title">Basket counts</h2>
      <MeasureForm modelId={model.id} canLocalCount={canCount(model.tokenizerKey)} />
      <ManualCountForm modelId={model.id} slices={slices} />

      <h2 className="section__title">Work run</h2>
      <WorkRunForm modelId={model.id} harnesses={harnessList} runs={workRuns} />

      <h2 className="section__title">Endpoints</h2>
      {endpoints.map((endpoint) => (
        <div key={endpoint.id} style={{ borderTop: "1px solid var(--color-rule)" }}>
          <EndpointEditor endpoint={endpoint} />
          <form action={deleteEndpointAction}>
            <input type="hidden" name="id" value={endpoint.id} />
            <button className="btn btn--danger" type="submit">
              Remove endpoint
            </button>
          </form>
        </div>
      ))}
      <AddEndpointForm modelId={model.id} />

      <form action={deleteModelAction} style={{ borderTop: "1px solid var(--color-rule)", paddingTop: "1.5rem" }}>
        <input type="hidden" name="id" value={model.id} />
        <button className="btn btn--danger" type="submit">
          Delete model
        </button>
      </form>
    </section>
  );
}
