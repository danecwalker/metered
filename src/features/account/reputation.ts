export const REPUTATION_START = 10;
export const REPUTATION_MAX = 100;
export const REPUTATION_ADD_MODEL = 40;
export const REPUTATION_AUTO_PUBLISH = 40;
export const REJECTS_BEFORE_BAN = 3;
export const REPUTATION_PUBLISH = 5;
export const REPUTATION_CORROBORATE = 2;
export const REPUTATION_REJECT = 8;

export function clampReputation(value: number): number {
  return Math.max(0, Math.min(REPUTATION_MAX, Math.round(value)));
}

export function canProposeModel(reputation: number, status: string): boolean {
  return status === "active" && reputation >= REPUTATION_ADD_MODEL;
}

export function canAutoPublish(
  reputation: number,
  status: string,
  rejectCount = 0,
): boolean {
  return (
    status === "active" &&
    rejectCount === 0 &&
    reputation >= REPUTATION_AUTO_PUBLISH
  );
}

export function shouldBan(rejectCount: number, status: string): boolean {
  if (status === "banned") return true;
  return rejectCount >= REJECTS_BEFORE_BAN;
}

export function afterPublish(reputation: number): number {
  return clampReputation(reputation + REPUTATION_PUBLISH);
}

export function afterCorroborate(reputation: number): number {
  return clampReputation(reputation + REPUTATION_CORROBORATE);
}

export function afterReject(reputation: number): number {
  return clampReputation(reputation - REPUTATION_REJECT);
}
