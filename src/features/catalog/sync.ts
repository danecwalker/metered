import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db/client";
import { catalogAliases, endpoints, models, type EndpointRow, type ModelRow } from "@/db/schema";
import type { CatalogAlias } from "@/features/catalog/aliases";
import { loadCatalog } from "@/features/catalog/models-dev";
import {
  listCatalogLabs,
  resolveCatalogModel,
  tokenizerForLab,
  type CatalogLab,
  type CatalogMatch,
  type CatalogOffering,
  type ResolveQuery,
} from "@/features/catalog/resolve";

type Db = ReturnType<typeof getDb>;

export async function listCatalogAliases(db: Db): Promise<CatalogAlias[]> {
  const rows = await db.select().from(catalogAliases);
  return rows.map((row) => ({ kind: row.kind, source: row.source, target: row.target }));
}

export async function loadCatalogLabs(): Promise<CatalogLab[]> {
  const catalog = await loadCatalog();
  return listCatalogLabs(catalog);
}

export async function detectFromRun(db: Db, query: ResolveQuery): Promise<CatalogMatch | null> {
  const [catalog, aliases] = await Promise.all([loadCatalog(), listCatalogAliases(db)]);
  return resolveCatalogModel(catalog, aliases, query);
}

export async function findLocalIdentity(
  db: Db,
  query: { sku: string; match: CatalogMatch | null },
): Promise<{ model: ModelRow; endpoint: EndpointRow } | null> {
  if (query.match) {
    const [byCatalog] = await db
      .select()
      .from(models)
      .where(eq(models.catalogId, query.match.modelId))
      .limit(1);
    if (byCatalog && byCatalog.status === "published") {
      const eps = await db.select().from(endpoints).where(eq(endpoints.modelId, byCatalog.id));
      const endpoint =
        eps.find((row) => row.status === "published" && row.providerId === query.match?.providerId) ??
        eps.find((row) => row.status === "published" && row.sku === query.match?.sku) ??
        eps.find((row) => row.status === "published" && row.sku === query.sku) ??
        eps.find((row) => row.status === "published" && row.providerId === query.match?.labId) ??
        eps.find((row) => row.status === "published") ??
        null;
      if (endpoint) return { model: byCatalog, endpoint };
    }
  }

  const rows = await db
    .select({ endpoint: endpoints, model: models })
    .from(endpoints)
    .innerJoin(models, eq(endpoints.modelId, models.id))
    .where(
      and(eq(endpoints.sku, query.sku), eq(endpoints.status, "published"), eq(models.status, "published")),
    );
  const row = rows[0];
  return row ? { model: row.model, endpoint: row.endpoint } : null;
}

export async function ensureCatalogIdentity(
  db: Db,
  match: CatalogMatch,
  options?: { notes?: string | null },
): Promise<{ model: ModelRow; endpoint: EndpointRow }> {
  const now = new Date().toISOString();
  let model = await findModel(db, match);

  if (!model) {
    const id = crypto.randomUUID();
    await db.insert(models).values({
      id,
      slug: await uniqueSlug(db, match.slug),
      name: match.modelName,
      lab: match.labName,
      tokenizerKey: tokenizerForLab(match.labId),
      status: "published",
      notes: options?.notes ?? match.description,
      catalogId: match.modelId,
      labId: match.labId,
      createdAt: now,
      updatedAt: now,
    });
    [model] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  } else {
    await db
      .update(models)
      .set({
        name: match.modelName,
        lab: match.labName,
        catalogId: match.modelId,
        labId: match.labId,
        status: "published",
        updatedAt: now,
        ...(model.lab === "Unlisted" || !model.notes
          ? { notes: options?.notes ?? match.description ?? model.notes }
          : {}),
      })
      .where(eq(models.id, model.id));
    [model] = await db.select().from(models).where(eq(models.id, model.id)).limit(1);
  }
  if (!model) throw new Error("Failed to persist catalog model.");

  const existing = await db.select().from(endpoints).where(eq(endpoints.modelId, model.id));
  const offerings = match.offerings.length
    ? match.offerings
    : [
        {
          providerId: match.providerId,
          providerName: match.providerName,
          sku: match.sku,
          listInput: match.listInput,
          listOutput: match.listOutput,
          listCacheHit: match.listCacheHit,
          listCacheWrite: match.listCacheWrite,
          contextNote: match.contextNote,
          firstParty: match.providerId === match.labId,
        } satisfies CatalogOffering,
      ];

  for (const [index, offering] of offerings.entries()) {
    const row =
      existing.find((item) => item.providerId === offering.providerId) ??
      existing.find(
        (item) =>
          !item.providerId &&
          item.provider.toLowerCase() === offering.providerName.toLowerCase(),
      );
    const publish =
      offering.firstParty || offering.providerId === match.providerId || row?.status === "published";
    const values = {
      provider: offering.providerName,
      sku: offering.sku,
      displayName: offering.providerName,
      listInput: offering.listInput,
      listOutput: offering.listOutput,
      listCacheHit: offering.listCacheHit,
      listCacheWrite: offering.listCacheWrite,
      contextNote: offering.contextNote,
      status: publish ? ("published" as const) : ("draft" as const),
      sortOrder: offering.firstParty ? 0 : index + 1,
      providerId: offering.providerId,
      catalogSku: offering.sku,
    };
    if (row) {
      await db.update(endpoints).set(values).where(eq(endpoints.id, row.id));
    } else {
      await db.insert(endpoints).values({
        id: crypto.randomUUID(),
        modelId: model.id,
        ...values,
      });
    }
  }

  const refreshed = await db.select().from(endpoints).where(eq(endpoints.modelId, model.id));
  const endpoint =
    refreshed.find((row) => row.providerId === match.providerId) ??
    refreshed.find((row) => row.providerId === match.labId) ??
    refreshed[0];
  if (!endpoint) throw new Error("Failed to persist catalog endpoint.");
  return { model, endpoint };
}

export async function refreshCatalogPrices(db: Db, modelId?: string): Promise<number> {
  const catalog = await loadCatalog();
  const aliases = await listCatalogAliases(db);
  const targetModels = modelId
    ? await db.select().from(models).where(eq(models.id, modelId))
    : await db.select().from(models);
  let wrote = 0;
  for (const model of targetModels) {
    const sku = model.catalogId ?? (await primarySku(db, model.id));
    if (!sku) continue;
    const match = resolveCatalogModel(catalog, aliases, {
      sku,
      lab: model.labId ?? undefined,
    });
    if (!match) continue;
    await ensureCatalogIdentity(db, match, { notes: model.notes });
    wrote += 1;
  }
  return wrote;
}

async function primarySku(db: Db, modelId: string): Promise<string | null> {
  const rows = await db.select().from(endpoints).where(eq(endpoints.modelId, modelId));
  return rows.find((row) => row.catalogSku)?.catalogSku ?? rows[0]?.sku ?? null;
}

async function findModel(db: Db, match: CatalogMatch): Promise<ModelRow | undefined> {
  const [byCatalog] = await db
    .select()
    .from(models)
    .where(eq(models.catalogId, match.modelId))
    .limit(1);
  if (byCatalog) return byCatalog;

  const [bySlug] = await db.select().from(models).where(eq(models.slug, match.slug)).limit(1);
  if (bySlug) return bySlug;

  for (const sku of [match.sku, ...match.offerings.map((item) => item.sku)]) {
    const [bySku] = await db
      .select({ model: models })
      .from(endpoints)
      .innerJoin(models, eq(endpoints.modelId, models.id))
      .where(eq(endpoints.sku, sku))
      .limit(1);
    if (bySku?.model) return bySku.model;
  }
  return undefined;
}

async function uniqueSlug(db: Db, base: string): Promise<string> {
  const [existing] = await db.select().from(models).where(eq(models.slug, base)).limit(1);
  if (!existing) return base;
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
