import type { Catalog, Model, ModelCost, ModelMetadata, Provider } from "@opencode-ai/models";
import {
  applyAlias,
  mergeAliases,
  normalizeToken,
  type CatalogAlias,
} from "@/features/catalog/aliases";
import { slugify } from "@/features/admin/schemas";
import type { TokenizerKey } from "@/features/pricing/types";

export type ResolveQuery = {
  sku?: string;
  provider?: string;
  lab?: string;
  modelName?: string;
  harnessSlug?: string;
  baseUrl?: string;
};

/** Product CLIs hit the lab's own endpoint. Hosts like Cortecs are not implied. */
export const HARNESS_FIRST_PARTY: Record<string, string> = {
  claude: "anthropic",
  chatgpt: "openai",
  gemini: "google",
  grok: "xai",
  qwen: "alibaba",
  kimi: "moonshotai",
  deepseek: "deepseek",
};

const FIRST_PARTY_HOSTS: Record<string, string> = {
  "api.anthropic.com": "anthropic",
  "api.openai.com": "openai",
  "api.x.ai": "xai",
  "generativelanguage.googleapis.com": "google",
  "aiplatform.googleapis.com": "google-vertex",
};

export type CatalogOffering = {
  providerId: string;
  providerName: string;
  sku: string;
  listInput: number;
  listOutput: number | null;
  listCacheHit: number | null;
  listCacheWrite: number | null;
  contextNote: string | null;
  firstParty: boolean;
};

export type CatalogMatch = {
  modelId: string;
  modelName: string;
  labId: string;
  labName: string;
  slug: string;
  providerId: string;
  providerName: string;
  sku: string;
  listInput: number;
  listOutput: number | null;
  listCacheHit: number | null;
  listCacheWrite: number | null;
  contextNote: string | null;
  description: string | null;
  offerings: CatalogOffering[];
};

export type CatalogLab = {
  id: string;
  name: string;
};

export function skuCandidates(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const hyphens = normalizeToken(trimmed);
  const dashed = hyphens.replace(/\./g, "-");
  const out: string[] = [];
  for (const item of [trimmed, lower, hyphens, dashed]) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}

export function tailOf(sku: string): string {
  const idx = sku.lastIndexOf("/");
  return idx >= 0 ? sku.slice(idx + 1) : sku;
}

export function prefixOf(sku: string): string {
  const idx = sku.lastIndexOf("/");
  return idx > 0 ? sku.slice(0, idx) : "";
}

function findModelKey(models: Record<string, unknown>, candidates: string[]): string | null {
  const keys = Object.keys(models);
  const lower = new Map(keys.map((key) => [key.toLowerCase(), key]));
  for (const candidate of candidates) {
    if (candidate in models) return candidate;
    const hit = lower.get(candidate.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function pricesFromCost(cost?: ModelCost): Pick<
  CatalogOffering,
  "listInput" | "listOutput" | "listCacheHit" | "listCacheWrite"
> {
  if (!cost) {
    return { listInput: 0, listOutput: null, listCacheHit: null, listCacheWrite: null };
  }
  const unpublished = cost.input === 0 && cost.output === 0;
  return {
    listInput: cost.input,
    listOutput: unpublished ? null : cost.output,
    listCacheHit: cost.cache_read ?? null,
    listCacheWrite: cost.cache_write ?? null,
  };
}

export function labNameOf(catalog: Catalog, labId: string): string {
  return catalog.providers[labId]?.name ?? labId;
}

function contextNoteOf(model: Model | ModelMetadata | undefined): string | null {
  const context = model?.limit?.context;
  if (context == null || context <= 0) return null;
  return `${context.toLocaleString("en-US")} context`;
}

function slugFromModelId(modelId: string, name: string): string {
  const tail = tailOf(modelId);
  return slugify(tail) || slugify(name);
}

function offeringOf(provider: Provider, offered: Model, labId: string, metadata?: ModelMetadata): CatalogOffering {
  return {
    providerId: provider.id,
    providerName: provider.name,
    sku: offered.id,
    ...pricesFromCost(offered.cost),
    contextNote: contextNoteOf(offered) ?? contextNoteOf(metadata),
    firstParty: provider.id === labId,
  };
}

function offeredMatchesMetadata(offered: Model, metadata: ModelMetadata): boolean {
  const metaTail = tailOf(metadata.id);
  const offerTail = tailOf(offered.id);
  const tails = new Set(skuCandidates(metaTail).map((item) => item.toLowerCase()));
  if (offered.id === metadata.id) return true;
  if (tails.has(offered.id.toLowerCase()) || tails.has(offerTail.toLowerCase())) return true;
  if (offered.name.trim().toLowerCase() === metadata.name.trim().toLowerCase()) return true;
  return false;
}

export function offeringsForModel(catalog: Catalog, metadata: ModelMetadata): CatalogOffering[] {
  const labId = prefixOf(metadata.id);
  const out: CatalogOffering[] = [];
  for (const provider of Object.values(catalog.providers)) {
    for (const offered of Object.values(provider.models)) {
      if (!offeredMatchesMetadata(offered, metadata)) continue;
      out.push(offeringOf(provider, offered, labId, metadata));
      break;
    }
  }
  return out.sort((left, right) => {
    if (left.firstParty !== right.firstParty) return left.firstParty ? -1 : 1;
    return left.providerName.localeCompare(right.providerName);
  });
}

function findMetadata(
  catalog: Catalog,
  candidates: string[],
  query: ResolveQuery,
  labHint: string,
): ModelMetadata | null {
  const hinted = labHint
    ? uniqueBy(
        candidates.flatMap((item) => skuCandidates(`${labHint}/${tailOf(item)}`)),
        (item) => item.toLowerCase(),
      )
    : [];
  const exact = findModelKey(catalog.models, [...hinted, ...candidates.filter((item) => item.includes("/"))]);
  if (exact) return catalog.models[exact];

  const byTail: ModelMetadata[] = [];
  const tails = new Set(
    candidates.flatMap((item) => skuCandidates(tailOf(item))).map((item) => item.toLowerCase()),
  );
  for (const model of Object.values(catalog.models)) {
    if (tails.has(tailOf(model.id).toLowerCase())) byTail.push(model);
  }
  if (labHint) {
    const inLab = byTail.filter((model) => prefixOf(model.id) === labHint);
    if (inLab.length >= 1) return inLab[0];
  }
  if (byTail.length === 1) return byTail[0];

  const named = matchByName(catalog, query.modelName ?? "", labHint) ?? matchByName(catalog, query.modelName ?? "");
  if (named) return named;
  return byTail[0] ?? null;
}

function matchByName(catalog: Catalog, name: string, labHint = ""): ModelMetadata | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const slug = slugify(name);
  const hits = Object.values(catalog.models).filter((model) => {
    if (labHint && prefixOf(model.id) !== labHint) return false;
    const modelName = model.name.toLowerCase();
    return modelName === needle || slugify(model.name) === slug;
  });
  return hits.length === 1 ? hits[0] : null;
}

export function hostOf(url: string): string {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function providerFromBaseUrl(catalog: Catalog, baseUrl?: string): string {
  const host = hostOf(baseUrl ?? "");
  if (!host) return "";
  if (FIRST_PARTY_HOSTS[host]) return FIRST_PARTY_HOSTS[host];
  for (const provider of Object.values(catalog.providers)) {
    const apiHost = hostOf(provider.api ?? "");
    if (apiHost && (host === apiHost || host.endsWith(`.${apiHost}`) || apiHost.endsWith(`.${host}`))) {
      return provider.id;
    }
  }
  return "";
}

function uniqueProviderForSku(catalog: Catalog, sku: string): string {
  if (!sku.trim()) return "";
  const candidates = skuCandidates(sku);
  const hits: string[] = [];
  for (const provider of Object.values(catalog.providers)) {
    if (findModelKey(provider.models, candidates)) hits.push(provider.id);
  }
  return hits.length === 1 ? hits[0] : "";
}

/**
 * Infer the models.dev provider that billed the run.
 * SKU is not enough: many hosts reuse the same model id.
 */
export function detectProviderId(
  catalog: Catalog,
  aliases: CatalogAlias[],
  query: ResolveQuery,
): string {
  const maps = mergeAliases(aliases);
  const explicit = applyAlias(maps.provider, query.provider);
  if (explicit && catalog.providers[explicit]) return explicit;

  const fromUrl = providerFromBaseUrl(catalog, query.baseUrl);
  if (fromUrl) return fromUrl;

  const harnessParty = HARNESS_FIRST_PARTY[query.harnessSlug ?? ""];
  if (harnessParty && catalog.providers[harnessParty]) return harnessParty;

  const sku = (query.sku ?? "").trim();
  const prefix = applyAlias(maps.provider, prefixOf(sku));
  if (prefix && catalog.providers[prefix] && query.harnessSlug !== "claude") {
    if (query.harnessSlug === "api" || query.harnessSlug === "opencode" || query.harnessSlug === "custom") {
      return prefix;
    }
  }

  const unique = uniqueProviderForSku(catalog, sku);
  if (unique) return unique;

  if (query.harnessSlug === "api" && catalog.providers.openrouter) return "openrouter";
  return "";
}

function pickPrimary(
  offerings: CatalogOffering[],
  hints: string[],
  labId: string,
): CatalogOffering | null {
  for (const hint of hints) {
    const hit = offerings.find((item) => item.providerId === hint);
    if (hit) return hit;
  }
  return offerings.find((item) => item.firstParty) ?? offerings.find((item) => item.providerId === labId) ?? offerings[0] ?? null;
}

export function resolveCatalogModel(
  catalog: Catalog,
  aliases: CatalogAlias[],
  query: ResolveQuery,
): CatalogMatch | null {
  const maps = mergeAliases(aliases);
  const skuIn = (query.sku ?? "").trim();
  const aliasedSku = skuIn ? applyAlias(maps.sku, skuIn) || skuIn : "";
  const labHint = applyAlias(maps.provider, query.lab) || prefixOf(aliasedSku) || prefixOf(skuIn);
  const resolvedSku = aliasedSku.includes("/")
    ? aliasedSku
    : skuIn.includes("/")
      ? `${applyAlias(maps.provider, prefixOf(skuIn))}/${tailOf(aliasedSku || skuIn)}`
      : aliasedSku;

  const rawCandidates = [
    ...skuCandidates(resolvedSku),
    ...skuCandidates(tailOf(resolvedSku)),
    ...skuCandidates(skuIn),
    ...skuCandidates(tailOf(skuIn)),
  ];
  const candidates = uniqueBy(rawCandidates.filter(Boolean), (item) => item.toLowerCase());
  const detected = detectProviderId(catalog, aliases, query);
  const hints = uniqueBy(
    [detected].filter((id) => id && catalog.providers[id]),
    (id) => id,
  );

  const metadata = findMetadata(catalog, candidates, query, labHint);
  if (!metadata) return null;

  const labId = prefixOf(metadata.id);
  const offerings = offeringsForModel(catalog, metadata);
  if (offerings.length === 0) return null;
  const primary = pickPrimary(offerings, hints, labId);
  if (!primary) return null;

  return {
    modelId: metadata.id,
    modelName: metadata.name,
    labId,
    labName: labNameOf(catalog, labId),
    slug: slugFromModelId(metadata.id, metadata.name),
    providerId: primary.providerId,
    providerName: primary.providerName,
    sku: primary.sku,
    listInput: primary.listInput,
    listOutput: primary.listOutput,
    listCacheHit: primary.listCacheHit,
    listCacheWrite: primary.listCacheWrite,
    contextNote: primary.contextNote,
    description: metadata.description ?? null,
    offerings,
  };
}

export function listCatalogLabs(catalog: Catalog): CatalogLab[] {
  const labs = new Map<string, CatalogLab>();
  for (const model of Object.values(catalog.models)) {
    const id = prefixOf(model.id);
    if (!id || labs.has(id)) continue;
    labs.set(id, { id, name: labNameOf(catalog, id) });
  }
  return [...labs.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function tokenizerForLab(labId: string): TokenizerKey {
  return labId === "openai" ? "o200k_base" : "manual";
}

export function labLogoUrl(labId: string): string {
  return `https://models.dev/logos/labs/${encodeURIComponent(labId)}.svg`;
}

export function providerLogoUrl(providerId: string): string {
  return `https://models.dev/logos/${encodeURIComponent(providerId)}.svg`;
}

export function modelsDevUrl(modelId: string): string {
  return `https://models.dev/models/${modelId}`;
}
