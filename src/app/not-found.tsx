import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid min-h-[calc(100svh-12rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-[22.5rem] text-center">
        <p className="text-muted mb-3 text-sm">404</p>
        <h1 className="section__title">No page here</h1>
        <p className="text-ink-2 mt-3 text-sm leading-relaxed">
          That route is not on Metered.
        </p>
        <Link
          className="btn btn--primary mt-8 inline-flex no-underline"
          href="/stacks"
        >
          All stacks
        </Link>
      </div>
    </section>
  );
}
