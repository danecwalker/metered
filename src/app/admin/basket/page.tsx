import { AdminNav } from "@/app/admin/admin-nav";
import { requireAdmin } from "@/features/admin/auth";
import { BASKET_VERSION } from "@/features/pricing/math";
import { ImportBasketForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function AdminBasketPage() {
  await requireAdmin();
  return (
    <section className="wrap section">
      <AdminNav current="/admin/basket" />
      <h1 className="section__title">Basket counts</h1>
      <p className="section__lede">
        Edit <code>cli/count-basket.yaml</code>, count on your machine, then
        upload the JSON. The web app never takes provider API keys. Each
        counted SKU is matched to models.dev and opened if it is not on the
        board yet.
      </p>
      <p className="field__help">
        Local: <code>npm run count:basket -- --cli-auth --out .cache/basket-counts.json</code>
        . Add one: <code>--model anthropic/claude-opus-5</code>. Index{" "}
        <code>{BASKET_VERSION}</code>.
      </p>
      <ImportBasketForm />
    </section>
  );
}
