import type { Catalog, ModelMetadata } from "@opencode-ai/models";
import { tailOf } from "@/features/catalog/resolve";
import type { CountTarget } from "@/features/measure/count-list";

export type ApiLab = "anthropic" | "xai" | "gemini" | "moonshot";

export type CountRoute =
  | { via: "local"; catalogId: string; sku: string; label: string; repo: string }
  | { via: "api"; catalogId: string; sku: string; label: string; lab: ApiLab }
  | { via: "none"; catalogId: string; sku: string; label: string; reason: string };

export function apiLabOf(lab: string): ApiLab | null {
  switch (lab.trim().toLowerCase()) {
    case "anthropic":
      return "anthropic";
    case "xai":
      return "xai";
    case "google":
    case "gemini":
      return "gemini";
    case "moonshot":
    case "moonshotai":
    case "kimi":
      return "moonshot";
    default:
      return null;
  }
}

export function huggingfaceRepo(
  model: { weights?: { url?: string }[] | null } | null | undefined,
): string | null {
  for (const weight of model?.weights ?? []) {
    const match = String(weight.url ?? "").match(
      /huggingface\.co\/([^/?#]+\/[^/?#]+)/i,
    );
    if (match) return match[1].replace(/\.git$/i, "");
  }
  return null;
}

function findMetadata(catalog: Catalog, target: CountTarget): ModelMetadata | null {
  const exact = catalog.models[target.catalogId];
  if (exact) return exact;
  const tail = target.sku.toLowerCase();
  const hits = Object.values(catalog.models).filter((model) => {
    if (tailOf(model.id).toLowerCase() !== tail) return false;
    if (target.lab && !model.id.toLowerCase().startsWith(`${target.lab.toLowerCase()}/`)) {
      return false;
    }
    return true;
  });
  return hits[0] ?? null;
}

/**
 * Open-weight models count locally from Hugging Face.
 * Closed labs fall through to an official count API when we have one.
 */
export function routeCountTarget(target: CountTarget, catalog: Catalog): CountRoute {
  const meta = findMetadata(catalog, target);
  const catalogId = meta?.id ?? target.catalogId;
  const label = meta?.name ?? target.sku;
  const repo = huggingfaceRepo(meta);

  if (meta?.open_weights && repo) {
    return { via: "local", catalogId, sku: target.sku, label, repo };
  }

  const api = apiLabOf(target.lab);
  if (api) {
    return { via: "api", catalogId, sku: target.sku, label, lab: api };
  }

  if (meta?.open_weights) {
    return {
      via: "none",
      catalogId,
      sku: target.sku,
      label,
      reason: "open weights, but models.dev has no Hugging Face tokenizer URL",
    };
  }

  return {
    via: "none",
    catalogId,
    sku: target.sku,
    label,
    reason: "not open-weight and no lab count API",
  };
}
