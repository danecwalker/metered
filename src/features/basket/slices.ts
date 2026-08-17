import type { ScenarioId, SliceId } from "@/features/pricing/types";

export type SliceDef = {
  id: SliceId;
  label: string;
  file: string;
  weight: number;
  why: string;
};

export const SLICES: SliceDef[] = [
  {
    id: "english",
    label: "English prose",
    file: "english.txt",
    weight: 0.3,
    why: "Default product copy, docs, and essays.",
  },
  {
    id: "code",
    label: "Code",
    file: "code.ts",
    weight: 0.25,
    why: "Where most production token spend sits.",
  },
  {
    id: "structured",
    label: "Structured",
    file: "structured.yaml",
    weight: 0.15,
    why: "JSON, YAML, and wire formats.",
  },
  {
    id: "tools",
    label: "Tool schemas",
    file: "tools.json",
    weight: 0.1,
    why: "Function-calling payloads, where fertility often doubles.",
  },
  {
    id: "cjk",
    label: "CJK",
    file: "cjk.txt",
    weight: 0.1,
    why: "English-trained tokenizers tax these scripts.",
  },
  {
    id: "instructions",
    label: "Instructions",
    file: "instructions.txt",
    weight: 0.1,
    why: "System prompts and product instructions.",
  },
];

export const SLICE_BY_ID = Object.fromEntries(
  SLICES.map((slice) => [slice.id, slice]),
) as Record<SliceId, SliceDef>;

export type ScenarioDef = {
  id: ScenarioId;
  label: string;
  inputFile: string;
  outputFile: string;
  blurb: string;
};

export const SCENARIOS: ScenarioDef[] = [
  {
    id: "chat",
    label: "Chat",
    inputFile: "chat-in.txt",
    outputFile: "chat-out.txt",
    blurb: "A short product question and a paragraph answer.",
  },
  {
    id: "rag",
    label: "RAG",
    inputFile: "rag-in.txt",
    outputFile: "rag-out.txt",
    blurb: "A long context pack and a brief extracted answer.",
  },
  {
    id: "extract",
    label: "Extract",
    inputFile: "extract-in.txt",
    outputFile: "extract-out.txt",
    blurb: "Unstructured notes in, JSON out.",
  },
  {
    id: "agent",
    label: "Agent turn",
    inputFile: "agent-in.txt",
    outputFile: "agent-out.txt",
    blurb: "System prompt, tool list, and one tool result.",
  },
  {
    id: "review",
    label: "Code review",
    inputFile: "review-in.txt",
    outputFile: "review-out.txt",
    blurb: "A real diff and a written review.",
  },
];
