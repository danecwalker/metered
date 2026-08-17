import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type {
  MeasurementSource,
  ModelStatus,
  TokenizerKey,
} from "@/features/pricing/types";

export const harnesses = sqliteTable("harnesses", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  blurb: text("blurb"),
});

export const models = sqliteTable("models", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  lab: text("lab").notNull(),
  tokenizerKey: text("tokenizer_key").notNull().$type<TokenizerKey>(),
  status: text("status").notNull().$type<ModelStatus>(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const endpoints = sqliteTable("endpoints", {
  id: text("id").primaryKey(),
  modelId: text("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  sku: text("sku").notNull(),
  displayName: text("display_name").notNull(),
  listInput: real("list_input").notNull(),
  listOutput: real("list_output"),
  listCacheHit: real("list_cache_hit"),
  listCacheWrite: real("list_cache_write"),
  contextNote: text("context_note"),
  status: text("status").notNull().$type<ModelStatus>(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const measurements = sqliteTable(
  "measurements",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    sliceId: text("slice_id").notNull(),
    nativeTokens: integer("native_tokens").notNull(),
    characterCount: integer("character_count").notNull(),
    source: text("source").notNull().$type<MeasurementSource>(),
    measuredAt: text("measured_at").notNull(),
  },
  (table) => [uniqueIndex("measurements_model_slice").on(table.modelId, table.sliceId)],
);

export const workRuns = sqliteTable(
  "work_runs",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    harnessId: text("harness_id")
      .notNull()
      .references(() => harnesses.id),
    suiteVersion: text("suite_version").notNull(),
    setting: text("setting").notNull().default("default"),
    tasks: integer("tasks").notNull(),
    passed: integer("passed"),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    cacheHitTokens: integer("cache_hit_tokens").notNull().default(0),
    source: text("source").notNull().$type<MeasurementSource>(),
    notes: text("notes"),
    measuredAt: text("measured_at").notNull(),
  },
  (table) => [
    uniqueIndex("work_runs_model_harness_suite_setting").on(
      table.modelId,
      table.harnessId,
      table.suiteVersion,
      table.setting,
    ),
  ],
);

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  status: text("status").notNull().$type<"pending" | "verified" | "rejected" | "published">(),
  integrity: text("integrity").notNull().unique(),
  suiteHash: text("suite_hash").notNull(),
  modelName: text("model_name").notNull(),
  modelSlug: text("model_slug").notNull(),
  lab: text("lab").notNull(),
  harnessId: text("harness_id").notNull(),
  harnessSlug: text("harness_slug").notNull(),
  provider: text("provider").notNull(),
  sku: text("sku").notNull(),
  setting: text("setting").notNull(),
  tasks: integer("tasks").notNull(),
  passed: integer("passed"),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  reasoningTokens: integer("reasoning_tokens").notNull(),
  cacheHitTokens: integer("cache_hit_tokens").notNull(),
  packageJson: text("package_json").notNull(),
  note: text("note"),
  reviewNote: text("review_note"),
  createdAt: text("created_at").notNull(),
});

export type HarnessRow = typeof harnesses.$inferSelect;
export type ModelRow = typeof models.$inferSelect;
export type EndpointRow = typeof endpoints.$inferSelect;
export type MeasurementRow = typeof measurements.$inferSelect;
export type WorkRunRow = typeof workRuns.$inferSelect;
export type SubmissionRow = typeof submissions.$inferSelect;
