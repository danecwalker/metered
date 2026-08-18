import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const actual = scryptSync(password, salt, KEY_LEN);
  const want = Buffer.from(expected, "hex");
  if (actual.length !== want.length) return false;
  return timingSafeEqual(actual, want);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function usernameError(value: string): string | null {
  const name = normalizeUsername(value);
  if (name.length < 3 || name.length > 24) return "Username must be 3-24 characters.";
  if (!/^[a-z0-9_]+$/.test(name)) return "Username can only use letters, numbers, and _.";
  return null;
}

export function passwordError(value: string): string | null {
  if (value.length < 10) return "Password must be at least 10 characters.";
  if (value.length > 200) return "Password is too long.";
  return null;
}
