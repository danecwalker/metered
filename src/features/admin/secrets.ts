export const EXAMPLE_ADMIN_SECRETS = [
  "metered",
  "change-me",
  "generate-a-long-random-string",
  "dev-only-not-for-production",
] as const;

export const MIN_ADMIN_PASSWORD_LENGTH = 12;
export const MIN_ADMIN_SECRET_LENGTH = 24;

export type AdminSecrets = {
  password: string;
  secret: string;
};

export type AdminSecretsEnv = {
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?: string;
  NODE_ENV?: string;
};

export type AdminSecretsRejectReason = "missing" | "example" | "short";

export type AdminSecretsInspection =
  | { ok: true; password: string; secret: string }
  | { ok: false; reason: AdminSecretsRejectReason };

export function isExampleAdminSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (EXAMPLE_ADMIN_SECRETS as readonly string[]).includes(normalized);
}

export function inspectAdminSecrets(env: AdminSecretsEnv): AdminSecretsInspection {
  const password = env.ADMIN_PASSWORD ?? "";
  const secret = env.ADMIN_SECRET ?? "";
  if (!password || !secret) return { ok: false, reason: "missing" };
  if (isExampleAdminSecret(password) || isExampleAdminSecret(secret)) {
    return { ok: false, reason: "example" };
  }
  if (env.NODE_ENV === "production") {
    if (
      password.length < MIN_ADMIN_PASSWORD_LENGTH ||
      secret.length < MIN_ADMIN_SECRET_LENGTH
    ) {
      return { ok: false, reason: "short" };
    }
  }
  return { ok: true, password, secret };
}

export function resolveAdminSecrets(env: AdminSecretsEnv): AdminSecrets | null {
  const result = inspectAdminSecrets(env);
  return result.ok ? { password: result.password, secret: result.secret } : null;
}

export function adminUnconfiguredMessage(reason: AdminSecretsRejectReason): string {
  switch (reason) {
    case "missing":
      return "Admin is not configured. Set ADMIN_PASSWORD and ADMIN_SECRET.";
    case "example":
      return "Admin is not configured. Replace example ADMIN_PASSWORD / ADMIN_SECRET values.";
    case "short":
      return "Admin is not configured. In production, ADMIN_PASSWORD must be at least 12 characters and ADMIN_SECRET at least 24.";
  }
}
