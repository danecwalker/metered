import { Models, type Catalog } from "@opencode-ai/models";

const TTL_MS = 60 * 60 * 1000;

type Cache = { at: number; catalog: Catalog };

declare global {
  var __meteredModelsDev: Cache | undefined;
}

async function snapshotCatalog(): Promise<Catalog> {
  const snap = await import("@opencode-ai/models/snapshot");
  return snap.default;
}

export async function loadCatalog(options?: {
  preferSnapshot?: boolean;
  timeoutMs?: number;
}): Promise<Catalog> {
  const cached = globalThis.__meteredModelsDev;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.catalog;

  if (options?.preferSnapshot) {
    const catalog = await snapshotCatalog();
    globalThis.__meteredModelsDev = { at: Date.now(), catalog };
    return catalog;
  }

  try {
    const client = Models.make();
    const catalog = await client.catalog({
      signal: AbortSignal.timeout(options?.timeoutMs ?? 8000),
    });
    globalThis.__meteredModelsDev = { at: Date.now(), catalog };
    return catalog;
  } catch {
    const catalog = await snapshotCatalog();
    globalThis.__meteredModelsDev = { at: Date.now(), catalog };
    return catalog;
  }
}

export function clearCatalogCache(): void {
  globalThis.__meteredModelsDev = undefined;
}
