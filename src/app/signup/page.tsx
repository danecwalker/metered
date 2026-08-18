import Link from "next/link";
import { AuthShell } from "@/shared/ui/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/eval" } = await searchParams;
  return (
    <AuthShell
      title="Create an account"
      lede="Needed only to upload a sealed run. The board stays public."
      footer={
        <>
          Already have one?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </>
      }
    >
      <SignupForm next={next} />
    </AuthShell>
  );
}
