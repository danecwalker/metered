import Link from "next/link";
import { Suspense } from "react";
import { listPublishedModelsForSearch } from "@/features/catalog/queries";
import { AccountNav, AdminNavLink } from "@/shared/ui/account-nav";
import { CommandPalette } from "@/shared/ui/command-palette";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export async function SiteHeader() {
  const models = await listPublishedModelsForSearch();

  return (
    <header
      data-nav
      className="group sticky top-0 z-50 flex justify-center bg-transparent py-3 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[scrolled]:py-2"
    >
      <div
        className={[
          "flex min-h-12 w-fit max-w-[calc(100%-1.5rem)] items-center gap-5",
          "rounded-full border border-transparent bg-transparent px-5 py-1.5",
          "shadow-[0_1px_0_oklch(100%_0_0/0)_inset,0_8px_24px_oklch(20%_0.01_80/0)]",
          "backdrop-blur-0 backdrop-saturate-100",
          "transition-[background-color,border-color,box-shadow,padding,backdrop-filter,-webkit-backdrop-filter] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-data-[scrolled]:border-rule group-data-[scrolled]:bg-material",
          "group-data-[scrolled]:shadow-[0_1px_0_oklch(100%_0_0/0.06)_inset,0_8px_24px_oklch(20%_0.01_80/0.16)]",
          "group-data-[scrolled]:backdrop-blur-xl group-data-[scrolled]:backdrop-saturate-150",
        ].join(" ")}
      >
        <div className="flex items-center gap-5">
          <Link
            className="font-display text-ink shrink-0 text-base font-semibold tracking-[-0.04em] no-underline hover:text-accent"
            href="/"
            aria-label="Metered"
          >
            Metered
          </Link>
          <nav className="flex items-center gap-5 max-[40rem]:hidden" aria-label="Primary">
            <Link
              className="text-ink-2 hover:text-accent text-sm no-underline whitespace-nowrap"
              href="/stacks"
            >
              Stacks
            </Link>
            <Link
              className="text-ink-2 hover:text-accent text-sm no-underline whitespace-nowrap"
              href="/methodology"
            >
              Method
            </Link>
            <Link
              className="text-ink-2 hover:text-accent text-sm no-underline whitespace-nowrap"
              href="/eval"
            >
              Eval
            </Link>
            <Suspense fallback={null}>
              <AdminNavLink />
            </Suspense>
          </nav>
        </div>
        <span className="bg-rule h-4 w-px shrink-0" aria-hidden />
        <div className="flex items-center gap-4">
          <Suspense fallback={null}>
            <AccountNav />
          </Suspense>
          <span className="bg-rule h-4 w-px shrink-0" aria-hidden />
          <div className="flex items-center">
            <CommandPalette models={models} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
