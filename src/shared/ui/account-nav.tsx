import Link from "next/link";
import { currentUser } from "@/features/account/auth";
import { logoutAction } from "@/features/account/actions";
import { userIsAdmin } from "@/features/admin/principals";

const navLink =
  "text-ink-2 hover:text-accent text-sm no-underline whitespace-nowrap";

export async function AccountNav() {
  const user = await currentUser();
  if (!user) {
    return (
      <Link className={navLink} href="/login?next=/eval">
        Sign in
      </Link>
    );
  }

  const admin = userIsAdmin(user);

  return (
    <>
      <span className="flex items-center gap-3.5 text-sm whitespace-nowrap max-[40rem]:hidden">
        <span className="text-ink" title={`Reputation ${user.reputation}`}>
          {user.username}
        </span>
        <form action={logoutAction}>
          <button
            className="text-muted hover:text-ink cursor-pointer border-0 bg-transparent p-0 text-sm"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </span>
      <details className="relative min-[40.01rem]:hidden">
        <summary className="text-ink hover:text-accent cursor-pointer list-none text-sm whitespace-nowrap [&::-webkit-details-marker]:hidden">
          {user.username}
        </summary>
        <div className="border-rule bg-paper-2 absolute top-[calc(100%+0.55rem)] right-0 z-50 min-w-40 rounded-md border py-1 shadow-[var(--shadow-raised)]">
          <p className="text-muted px-3 pt-2 pb-1.5 text-xs">Rep {user.reputation}</p>
          {admin ? (
            <Link
              className="text-ink hover:bg-paper-3 block px-3 py-2.5 text-sm no-underline"
              href="/admin"
            >
              Admin
            </Link>
          ) : null}
          <form action={logoutAction}>
            <button
              className="text-ink hover:bg-paper-3 w-full cursor-pointer border-0 bg-transparent px-3 py-2.5 text-left text-sm"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </details>
    </>
  );
}

export async function AdminNavLink() {
  const user = await currentUser();
  if (!user || !userIsAdmin(user)) return null;
  return (
    <Link className={`${navLink} max-[40rem]:hidden`} href="/admin">
      Admin
    </Link>
  );
}
