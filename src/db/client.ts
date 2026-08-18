import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { harnesses } from "@/db/schema";
import { backfillRunClock, ensureOfficialCatalog, seedIfEmpty } from "@/db/seed";
import { HARNESSES } from "@/features/harness/catalog";

const DDL = `
CREATE TABLE IF NOT EXISTS harnesses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  blurb TEXT
);
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lab TEXT NOT NULL,
  tokenizer_key TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS endpoints (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  sku TEXT NOT NULL,
  display_name TEXT NOT NULL,
  list_input DOUBLE PRECISION NOT NULL,
  list_output DOUBLE PRECISION,
  list_cache_hit DOUBLE PRECISION,
  list_cache_write DOUBLE PRECISION,
  context_note TEXT,
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS catalog_aliases (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  slice_id TEXT NOT NULL,
  native_tokens INTEGER NOT NULL,
  character_count INTEGER NOT NULL,
  source TEXT NOT NULL,
  measured_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS measurements_model_slice
  ON measurements (model_id, slice_id);
CREATE TABLE IF NOT EXISTS work_runs (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  harness_id TEXT NOT NULL REFERENCES harnesses(id),
  suite_version TEXT NOT NULL,
  setting TEXT NOT NULL DEFAULT 'default',
  tasks INTEGER NOT NULL,
  passed INTEGER,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER,
  duration_ms INTEGER,
  source TEXT NOT NULL,
  notes TEXT,
  measured_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS work_runs_model_harness_suite_setting
  ON work_runs (model_id, harness_id, suite_version, setting);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  integrity TEXT NOT NULL UNIQUE,
  suite_hash TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_slug TEXT NOT NULL,
  lab TEXT NOT NULL,
  harness_id TEXT NOT NULL,
  harness_slug TEXT NOT NULL,
  provider TEXT NOT NULL,
  sku TEXT NOT NULL,
  setting TEXT NOT NULL,
  tasks INTEGER NOT NULL,
  passed INTEGER,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  reasoning_tokens INTEGER NOT NULL,
  cache_hit_tokens INTEGER NOT NULL,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER,
  duration_ms INTEGER,
  package_json TEXT NOT NULL,
  note TEXT,
  review_note TEXT,
  user_id TEXT,
  screen_json TEXT,
  new_model INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  reputation INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active',
  reject_count INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
ALTER TABLE work_runs ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE work_runs ADD COLUMN IF NOT EXISTS attempts INTEGER;
ALTER TABLE work_runs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempts INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE models ADD COLUMN IF NOT EXISTS catalog_id TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS lab_id TEXT;
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS provider_id TEXT;
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS catalog_sku TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS models_catalog_id
  ON models (catalog_id) WHERE catalog_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS catalog_aliases_kind_source
  ON catalog_aliases (kind, source);
`;

type Db = NodePgDatabase<typeof schema>;

declare global {
  var __meteredPool: Pool | undefined;
  var __meteredDb: Db | undefined;
  var __meteredBoot: Promise<Db> | undefined;
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function getPool(): Pool {
  if (!globalThis.__meteredPool) {
    globalThis.__meteredPool = new Pool({ connectionString: databaseUrl() });
  }
  return globalThis.__meteredPool;
}

export function getDb(): Db {
  if (!globalThis.__meteredDb) {
    globalThis.__meteredDb = drizzle(getPool(), { schema });
  }
  return globalThis.__meteredDb;
}

async function seedHarnesses() {
  const db = getDb();
  for (const harness of HARNESSES) {
    await db
      .insert(harnesses)
      .values(harness)
      .onConflictDoUpdate({
        target: harnesses.id,
        set: {
          slug: harness.slug,
          name: harness.name,
          kind: harness.kind,
          blurb: harness.blurb,
        },
      });
  }
}

async function boot(): Promise<Db> {
  await getPool().query(DDL);
  await seedHarnesses();
  await seedIfEmpty();
  await ensureOfficialCatalog();
  await backfillRunClock();
  return getDb();
}

export function ensureReady(): Promise<Db> {
  if (!globalThis.__meteredBoot) {
    globalThis.__meteredBoot = boot().catch((error) => {
      globalThis.__meteredBoot = undefined;
      throw error;
    });
  }
  return globalThis.__meteredBoot;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
