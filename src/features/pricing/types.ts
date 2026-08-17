export type ModelStatus = "draft" | "published";
export type MeasurementSource = "official" | "estimate" | "manual";

export type TokenizerKey = "o200k_base" | "cl100k_base" | "manual";

export type SliceId =
  | "english"
  | "code"
  | "structured"
  | "tools"
  | "cjk"
  | "instructions";

export type ScenarioId = "chat" | "rag" | "extract" | "agent" | "review";
