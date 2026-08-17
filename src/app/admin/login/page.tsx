import { authConfigured, authUnconfiguredMessage } from "@/features/admin/auth";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const configured = authConfigured();

  return (
    <section className="wrap section" style={{ maxWidth: 420 }}>
      <h1 className="section__title">Admin</h1>
      {configured ? (
        <>
          <p className="section__lede">
            Sign in to add models, stickers, and basket counts.
          </p>
          <AdminLoginForm />
        </>
      ) : (
        <>
          <p className="section__lede">
            Sign in is disabled until admin secrets are configured.
          </p>
          <p className="alert" role="alert">
            {authUnconfiguredMessage() ?? "Admin is not configured."}
          </p>
        </>
      )}
    </section>
  );
}
