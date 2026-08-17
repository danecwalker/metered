import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap section">
      <h1 className="section__title">No page here</h1>
      <p className="section__lede">That route is not on Metered.</p>
      <Link className="btn" href="/">
        Back to Stacks
      </Link>
    </section>
  );
}
