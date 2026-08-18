import Link from "next/link";
import { BASKET_VERSION } from "@/features/pricing/math";

export function SiteFooter() {
  return (
    <footer className="border-rule text-muted border-t py-6 text-xs">
      <div className="mx-auto flex w-[min(1120px,calc(100%-2*clamp(1rem,4vw,1.5rem)))] flex-wrap items-baseline gap-x-6 gap-y-2">
        <span>Metered</span>
        <span>{BASKET_VERSION}</span>
        <Link className="text-muted hover:text-accent no-underline whitespace-nowrap" href="/stacks">
          Stacks
        </Link>
        <Link className="text-muted hover:text-accent no-underline whitespace-nowrap" href="/methodology">
          Method
        </Link>
        <Link className="text-muted hover:text-accent no-underline whitespace-nowrap" href="/eval">
          Eval
        </Link>
        <Link className="text-muted hover:text-accent no-underline whitespace-nowrap" href="/admin">
          Admin
        </Link>
      </div>
    </footer>
  );
}
