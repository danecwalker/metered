"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ensureReady } from "@/db/client";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
} from "@/features/account/auth";
import {
  hashPassword,
  normalizeUsername,
  passwordError,
  usernameError,
  verifyPassword,
} from "@/features/account/password";
import { REPUTATION_START } from "@/features/account/reputation";
import { userIsAdmin } from "@/features/admin/principals";

export type AccountState = { ok: false; error: string } | { ok: true };

function safeNext(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/eval";
}

export async function signupAction(
  _prev: AccountState | null,
  formData: FormData,
): Promise<AccountState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/eval"));
  const nameErr = usernameError(username);
  if (nameErr) return { ok: false, error: nameErr };
  const passErr = passwordError(password);
  if (passErr) return { ok: false, error: passErr };
  const db = await ensureReady();
  const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing) return { ok: false, error: "That username is taken." };
  const id = crypto.randomUUID();
  const role = userIsAdmin({ username, role: "user" }) ? "admin" : "user";
  await db.insert(users).values({
    id,
    username,
    passwordHash: hashPassword(password),
    reputation: REPUTATION_START,
    status: "active",
    rejectCount: 0,
    role,
    createdAt: new Date().toISOString(),
  });
  await createSession(id);
  redirect(next);
}

export async function loginAction(
  _prev: AccountState | null,
  formData: FormData,
): Promise<AccountState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/eval"));
  const db = await ensureReady();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Username or password did not match." };
  }
  if (user.status === "banned") {
    return { ok: false, error: "This account is banned." };
  }
  if (userIsAdmin(user) && user.role !== "admin") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
  }
  await createSession(user.id);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
