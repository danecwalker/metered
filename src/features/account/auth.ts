import "server-only";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureReady } from "@/db/client";
import { userSessions, users, type UserRow } from "@/db/schema";

export const USER_COOKIE = "metered_user";
const SESSION_DAYS = 30;

export async function currentUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (!token) return null;
  const db = await ensureReady();
  const [row] = await db
    .select({ user: users, expiresAt: userSessions.expiresAt })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.token, token))
    .limit(1);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(userSessions).where(eq(userSessions.token, token));
    return null;
  }
  return row.user;
}

export async function requireUser(): Promise<UserRow> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/eval");
  if (user.status === "banned") redirect("/login?banned=1");
  return user;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = await ensureReady();
  await db.insert(userSessions).values({
    token,
    userId,
    expiresAt: expires.toISOString(),
  });
  const jar = await cookies();
  jar.set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (token) {
    const db = await ensureReady();
    await db.delete(userSessions).where(eq(userSessions.token, token));
  }
  jar.delete(USER_COOKIE);
}
