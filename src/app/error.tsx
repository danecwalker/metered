"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="grid min-h-[calc(100svh-12rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-[22.5rem] text-center">
        <h1 className="section__title">Something broke</h1>
        <p className="text-ink-2 mt-3 text-sm leading-relaxed">
          The page failed to render. Try again, or go back to stacks.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button className="btn btn--primary" type="button" onClick={reset}>
            Try again
          </button>
          <a className="btn no-underline" href="/stacks">
            All stacks
          </a>
        </div>
      </div>
    </section>
  );
}
