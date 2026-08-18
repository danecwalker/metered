import { AdminNav } from "@/app/admin/admin-nav";
import { requireAdmin } from "@/features/admin/auth";
import {
  banUserAction,
  lookupUsers,
  setUserReputationAction,
  setUserRoleAction,
  unbanUserAction,
} from "@/features/admin/users";
import {
  REPUTATION_ADD_MODEL,
  REPUTATION_AUTO_PUBLISH,
} from "@/features/account/reputation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const rows = await lookupUsers(q);

  return (
    <section className="wrap section">
      <AdminNav current="/admin/users" />
      <h1 className="section__title">Users</h1>
      <p className="section__lede">
        The system auto-blocks bad runs and auto-bans repeat identity abuse.
        You can unban, set reputation, and publish a blocked package anyway.
        Reputation {REPUTATION_AUTO_PUBLISH}+ with no prior rejects
        publishes on submit. Reputation {REPUTATION_ADD_MODEL}+ can file a
        SKU that models.dev does not know yet.
      </p>

      <form className="mb-8 flex flex-wrap gap-2" action="/admin/users" method="get">
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="Look up a username"
          aria-label="Username"
        />
        <button className="btn" type="submit">
          Look up
        </button>
      </form>

      {rows.length === 0 ? (
        <p>No users match.</p>
      ) : (
        <div className="table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Role</th>
                <th className="num">Reputation</th>
                <th className="num">Rejects</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="model-name">{user.username}</span>
                    <span className="model-meta">{user.id.slice(0, 8)}</span>
                  </td>
                  <td>
                    <span className="pill">{user.status}</span>
                  </td>
                  <td>
                    <form action={setUserRoleAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="id" value={user.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={user.role === "admin" ? "user" : "admin"}
                      />
                      <button className="btn" type="submit">
                        {user.role === "admin" ? "Revoke admin" : "Make admin"}
                      </button>
                    </form>
                  </td>
                  <td className="num">
                    <form action={setUserReputationAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="id" value={user.id} />
                      <input
                        className="input"
                        name="reputation"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={user.reputation}
                        aria-label={`Reputation for ${user.username}`}
                        style={{ width: "5.5rem", minHeight: "2.2rem" }}
                      />
                      <button className="btn" type="submit">
                        Set
                      </button>
                    </form>
                  </td>
                  <td className="num">{user.rejectCount}</td>
                  <td>
                    {user.status === "banned" ? (
                      <form action={unbanUserAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <button className="btn btn--primary" type="submit">
                          Unban
                        </button>
                      </form>
                    ) : (
                      <form action={banUserAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <button className="btn btn--danger" type="submit">
                          Ban
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
