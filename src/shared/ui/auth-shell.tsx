import type { ReactNode } from "react";

export function AuthShell({
  title,
  lede,
  footer,
  children,
}: {
  title: string;
  lede: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid min-h-[calc(100svh-12rem)] place-items-center px-4 py-12">
      <div className="border-rule bg-paper-2 w-full max-w-[22.5rem] rounded-[12px] border px-7 py-8">
        <h1 className="font-display text-ink text-[1.5rem] font-semibold tracking-[-0.04em]">
          {title}
        </h1>
        <p className="text-muted mt-2 text-sm leading-snug">{lede}</p>
        <div className="mt-7">{children}</div>
        <p className="text-muted mt-6 text-center text-sm">{footer}</p>
      </div>
    </section>
  );
}
