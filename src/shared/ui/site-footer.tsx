import Link from "next/link";
import { BASKET_VERSION } from "@/features/pricing/math";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span>Metered</span>
        <span>Work index · {BASKET_VERSION}</span>
        <Link href="/methodology">Method</Link>
        <Link href="/compare">Paste text</Link>
        <Link href="/eval">Eval</Link>
        <Link href="/admin">Admin</Link>
      </div>
    </footer>
  );
}
