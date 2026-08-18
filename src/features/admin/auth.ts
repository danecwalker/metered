import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/features/account/auth";
import { ADMIN_COOKIE, expectedSessionToken } from "@/features/admin/auth-edge";
import { userIsAdmin } from "@/features/admin/principals";
import {
  adminUnconfiguredMessage,
  inspectAdminSecrets,
  resolveAdminSecrets,
  type AdminSecrets,
} from "@/features/admin/secrets";

export { ADMIN_COOKIE, expectedSessionToken };

function configured(): AdminSecrets | null {
  return resolveAdminSecrets({
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });
}

export function passwordsMatch(input: string): boolean {
  const cfg = configured();
  if (!cfg) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(cfg.password);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const expected = await expectedSessionToken();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value;
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function requireAdmin(): Promise<void> {
  if (await isAdmin()) return;
  const user = await currentUser();
  if (user && user.status === "active" && userIsAdmin(user)) return;
  redirect("/login?next=/admin");
}

export function authConfigured(): boolean {
  return configured() !== null;
}

export function authUnconfiguredMessage(): string | null {
  const status = inspectAdminSecrets({
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });
  return status.ok ? null : adminUnconfiguredMessage(status.reason);
}
