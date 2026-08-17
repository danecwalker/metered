"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="wrap section">
      <h1 className="section__title">The page failed to render</h1>
      <p className="section__lede">{error.message}</p>
      <button className="btn" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
