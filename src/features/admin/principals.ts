export function listedAdminUsernames(): string[] {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

export function userIsAdmin(user: { username: string; role?: string | null }): boolean {
  if (user.role === "admin") return true;
  return listedAdminUsernames().includes(user.username.trim().toLowerCase());
}
