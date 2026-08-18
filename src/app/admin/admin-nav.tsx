import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Models" },
  { href: "/admin/basket", label: "Basket" },
  { href: "/admin/aliases", label: "Aliases" },
  { href: "/admin/submissions", label: "Packages" },
  { href: "/admin/users", label: "Users" },
] as const;

export function AdminNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <p className="model-meta">
      {LINKS.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? " / " : null}
          {link.href === current ? (
            link.label
          ) : (
            <Link href={link.href}>{link.label}</Link>
          )}
        </span>
      ))}
    </p>
  );
}
