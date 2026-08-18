import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/shared/ui/auth-shell";
import { authConfigured } from "@/features/admin/auth";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLoginPage() {
  const configured = authConfigured();

  return (
    <AuthShell
      title="Admin"
      lede="Use your Metered account if it is listed as admin. The password form is only a fallback."
      footer={
        <>
          Prefer your account? <Link href="/login?next=/admin">Sign in</Link>
        </>
      }
    >
      {configured ? (
        <AdminLoginForm />
      ) : (
        <p className="alert" role="alert">
          Password login is off. Sign in with a user named in ADMIN_USERNAMES.
        </p>
      )}
    </AuthShell>
  );
}
