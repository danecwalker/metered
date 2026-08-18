import Link from "next/link";
import { AuthShell } from "@/shared/ui/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; banned?: string }>;
}) {
  const { next = "/eval", banned } = await searchParams;
  return (
    <AuthShell
      title="Sign in"
      lede="Anyone can read the board. Uploading a run needs an account."
      footer={
        <>
          No account?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create one</Link>
        </>
      }
    >
      {banned ? (
        <p className="alert mb-5" role="status">
          This account is banned. An admin can unban it.
        </p>
      ) : null}
      <LoginForm next={next} />
    </AuthShell>
  );
}
