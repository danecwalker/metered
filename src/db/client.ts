import "server-only";

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import path from "node:path";
import * as schema from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
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
  list_input REAL NOT NULL,
  list_output REAL,
  list_cache_hit REAL,
  list_cache_write REAL,
  context_note TEXT,
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
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
  harness_id TEXT NOT NULL DEFAULT 'hrs_api' REFERENCES harnesses(id),
  suite_version TEXT NOT NULL,
  setting TEXT NOT NULL DEFAULT 'default',
  tasks INTEGER NOT NULL,
  passed INTEGER,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  notes TEXT,
  measured_at TEXT NOT NULL
);
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
  package_json TEXT NOT NULL,
  note TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL
);
`;

type Db = LibSQLDatabase<typeof schema>;

declare global {
  var __meteredClient: Client | undefined;
  var __meteredDb: Db | undefined;
  var __meteredBoot: Promise<Db> | undefined;
}

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = path.join(process.cwd(), "data", "metered.db");
  return `file:${file}`;
}

export function getClient(): Client {
  if (!globalThis.__meteredClient) {
    globalThis.__meteredClient = createClient({ url: databaseUrl() });
  }
  return globalThis.__meteredClient;
}

export function getDb(): Db {
  if (!globalThis.__meteredDb) {
    globalThis.__meteredDb = drizzle(getClient(), { schema });
  }
  return globalThis.__meteredDb;
}

async function seedHarnesses() {
  const client = getClient();
  for (const harness of HARNESSES) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO harnesses (id, slug, name, kind, blurb) VALUES (?, ?, ?, ?, ?)`,
      args: [harness.id, harness.slug, harness.name, harness.kind, harness.blurb],
    });
  }
}

async function columnNames(table: string): Promise<Set<string>> {
  const cols = await getClient().execute(`PRAGMA table_info(${table})`);
  return new Set(cols.rows.map((row) => String(row.name)));
}

async function migrateWorkRuns() {
  const client = getClient();
  const names = await columnNames("work_runs");
  if (names.size === 0) return;
  if (!names.has("harness_id")) {
    try {
      await client.execute(
        `ALTER TABLE work_runs ADD COLUMN harness_id TEXT NOT NULL DEFAULT 'hrs_api'`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("duplicate column name")) throw error;
    }
  }
  await client.execute(`DROP INDEX IF EXISTS work_runs_model_suite_setting`);
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS work_runs_model_harness_suite_setting
     ON work_runs (model_id, harness_id, suite_version, setting)`,
  );
}

async function boot(): Promise<Db> {
  await getClient().executeMultiple(DDL);
  await seedHarnesses();
  await migrateWorkRuns();
  await seedIfEmpty();
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
