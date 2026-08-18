"use server";

import { desc, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/auth";
import { normalizeUsername } from "@/features/account/password";
import { clampReputation } from "@/features/account/reputation";
import { ensureReady } from "@/db/client";
import { users } from "@/db/schema";

export async function lookupUsers(query: string) {
  await requireAdmin();
  const db = await ensureReady();
  const q = normalizeUsername(query).replace(/[^a-z0-9_]/g, "");
  if (!q) {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(25);
  }
  return db
    .select()
    .from(users)
    .where(like(users.username, `%${q}%`))
    .orderBy(desc(users.createdAt))
    .limit(25);
}

export async function setUserReputationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reputation = clampReputation(Number(formData.get("reputation")));
  const db = await ensureReady();
  await db.update(users).set({ reputation }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export async function banUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  await db.update(users).set({ status: "banned" }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export async function unbanUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await ensureReady();
  await db.update(users).set({ status: "active" }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") === "admin" ? "admin" : "user";
  const db = await ensureReady();
  await db.update(users).set({ role }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
