"use client";

import { guessLabId } from "@/features/catalog/aliases";
import { labLogoUrl, providerLogoUrl } from "@/features/catalog/resolve";

export function CatalogLogo({
  kind,
  id,
  name,
  size = 18,
}: {
  kind: "lab" | "provider";
  id?: string | null;
  name?: string | null;
  size?: number;
}) {
  const resolved = id?.trim() || guessLabId(name);
  if (!resolved) return null;
  const src = kind === "lab" ? labLogoUrl(resolved) : providerLogoUrl(resolved);
  return (
    <span
      className="catalog-mark"
      style={
        {
          width: size,
          height: size,
          "--catalog-mark": `url("${src}")`,
        } as React.CSSProperties
      }
      title={name ?? resolved}
      aria-hidden
    />
  );
}
