import {
  canAutoPublish,
  canProposeModel,
  REPUTATION_AUTO_PUBLISH,
  REJECTS_BEFORE_BAN,
} from "@/features/account/reputation";
import { identityError } from "@/features/eval/identity";
import { stackConfidence, type RunSample } from "@/features/eval/confidence";

export type ScreenInput = {
  harnessSlug: string;
  sku: string;
  catalogKnown: boolean;
  user: {
    reputation: number;
    status: "active" | "banned";
    rejectCount: number;
  };
  peers: RunSample[];
};

export type ScreenReport = {
  recommend: "hold" | "reject" | "publish";
  reasons: string[];
  catalog: "known" | "new";
  identity: "ok" | "bad";
  corroboration: { independent: number; label: string };
};

export function screenSubmission(input: ScreenInput): ScreenReport {
  const reasons: string[] = [];
  const identity = identityError(input.harnessSlug, input.sku);
  const confidence = stackConfidence(input.peers);
  const catalog = input.catalogKnown ? "known" : "new";

  if (input.user.status === "banned") {
    reasons.push("Account is banned.");
  }
  if (input.user.rejectCount > 0) {
    reasons.push(
      `${input.user.rejectCount} prior reject${input.user.rejectCount === 1 ? "" : "s"}. Ban at ${REJECTS_BEFORE_BAN}.`,
    );
  }
  if (identity) {
    reasons.push(identity);
  }
  if (!input.catalogKnown) {
    if (canProposeModel(input.user.reputation, input.user.status)) {
      reasons.push("New SKU. High-reputation user may propose it.");
    } else {
      reasons.push("SKU is not in the models.dev catalog. Reputation is too low to propose a model.");
    }
  }
  if (confidence.independent === 0) {
    reasons.push("No prior independent run of this stack.");
  } else {
    reasons.push(confidence.label + ".");
  }

  const reject =
    input.user.status === "banned" ||
    Boolean(identity) ||
    (!input.catalogKnown && !canProposeModel(input.user.reputation, input.user.status));

  const publish =
    !reject &&
    canAutoPublish(input.user.reputation, input.user.status, input.user.rejectCount);

  if (publish) {
    reasons.push(`Reputation ${input.user.reputation} meets the ${REPUTATION_AUTO_PUBLISH}+ auto-publish bar.`);
  } else if (!reject && input.user.rejectCount > 0) {
    reasons.push("Prior reject. Hold for review.");
  }

  return {
    recommend: reject ? "reject" : publish ? "publish" : "hold",
    reasons,
    catalog,
    identity: identity ? "bad" : "ok",
    corroboration: { independent: confidence.independent, label: confidence.label },
  };
}
