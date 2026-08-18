import { doublePrecision, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import type {
  MeasurementSource,
  ModelStatus,
  TokenizerKey,
} from "@/features/pricing/types";

export const harnesses = pgTable("harnesses", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  blurb: text("blurb"),
});

export const models = pgTable("models", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  lab: text("lab").notNull(),
  tokenizerKey: text("tokenizer_key").notNull().$type<TokenizerKey>(),
  status: text("status").notNull().$type<ModelStatus>(),
  notes: text("notes"),
  catalogId: text("catalog_id"),
  labId: text("lab_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const endpoints = pgTable("endpoints", {
  id: text("id").primaryKey(),
  modelId: text("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  sku: text("sku").notNull(),
  displayName: text("display_name").notNull(),
  listInput: doublePrecision("list_input").notNull(),
  listOutput: doublePrecision("list_output"),
  listCacheHit: doublePrecision("list_cache_hit"),
  listCacheWrite: doublePrecision("list_cache_write"),
  contextNote: text("context_note"),
  status: text("status").notNull().$type<ModelStatus>(),
  sortOrder: integer("sort_order").notNull().default(0),
  providerId: text("provider_id"),
  catalogSku: text("catalog_sku"),
});

export const catalogAliases = pgTable(
  "catalog_aliases",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().$type<"provider" | "sku">(),
    source: text("source").notNull(),
    target: text("target").notNull(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("catalog_aliases_kind_source").on(table.kind, table.source)],
);

export const measurements = pgTable(
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

export const workRuns = pgTable(
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
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    attempts: integer("attempts"),
    durationMs: integer("duration_ms"),
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

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  reputation: integer("reputation").notNull().default(10),
  status: text("status").notNull().$type<"active" | "banned">().default("active"),
  rejectCount: integer("reject_count").notNull().default(0),
  role: text("role").notNull().$type<"user" | "admin">().default("user"),
  createdAt: text("created_at").notNull(),
});

export const userSessions = pgTable("user_sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
});

export const submissions = pgTable("submissions", {
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
  cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
  attempts: integer("attempts"),
  durationMs: integer("duration_ms"),
  packageJson: text("package_json").notNull(),
  note: text("note"),
  reviewNote: text("review_note"),
  userId: text("user_id"),
  screenJson: text("screen_json"),
  newModel: integer("new_model").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type HarnessRow = typeof harnesses.$inferSelect;
export type ModelRow = typeof models.$inferSelect;
export type EndpointRow = typeof endpoints.$inferSelect;
export type MeasurementRow = typeof measurements.$inferSelect;
export type WorkRunRow = typeof workRuns.$inferSelect;
export type SubmissionRow = typeof submissions.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type CatalogAliasRow = typeof catalogAliases.$inferSelect;
