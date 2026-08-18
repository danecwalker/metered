export type RunSample = {
  userId: string;
  reputation: number;
  passed: number | null;
  tasks: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
};

export type Confidence = {
  level: "none" | "low" | "medium" | "high";
  independent: number;
  weight: number;
  label: string;
};

function tokensOf(sample: RunSample): number {
  return sample.inputTokens + sample.outputTokens + sample.reasoningTokens;
}

export function runsAgree(a: RunSample, b: RunSample): boolean {
  if (a.passed !== b.passed || a.tasks !== b.tasks) return false;
  const left = tokensOf(a);
  const right = tokensOf(b);
  const slack = Math.max(80, Math.round(0.15 * Math.max(left, right, 1)));
  return Math.abs(left - right) <= slack;
}

function latestPerUser(samples: RunSample[]): RunSample[] {
  const byUser = new Map<string, RunSample>();
  for (const sample of samples) {
    if (!sample.userId) continue;
    byUser.set(sample.userId, sample);
  }
  return [...byUser.values()];
}

export function stackConfidence(samples: RunSample[]): Confidence {
  const unique = latestPerUser(samples.filter((sample) => sample.reputation >= 0));
  if (unique.length === 0) {
    return { level: "none", independent: 0, weight: 0, label: "no independent runs" };
  }

  let best: RunSample[] = [];
  for (const seed of unique) {
    const cluster = unique.filter((other) => runsAgree(seed, other));
    if (cluster.length > best.length) best = cluster;
  }
  const independent = best.length;
  const weight = best.reduce((sum, sample) => sum + Math.max(0, sample.reputation), 0);
  let level: Confidence["level"] = "low";
  if (independent >= 3 && weight >= 50) level = "high";
  else if (independent >= 2) level = "medium";
  const label =
    independent === 1
      ? "1 independent run"
      : `${independent} independent runs agree`;
  return { level, independent, weight, label };
}
