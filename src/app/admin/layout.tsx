import { Suspense } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="wrap section">Loading…</div>}>{children}</Suspense>;
}
