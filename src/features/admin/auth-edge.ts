import { resolveAdminSecrets } from "@/features/admin/secrets";

export const ADMIN_COOKIE = "metered_admin";

export async function expectedSessionToken(): Promise<string | null> {
  const cfg = resolveAdminSecrets({
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!cfg) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cfg.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`admin:${cfg.password}`),
  );
  return [...new Uint8Array(sig)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
