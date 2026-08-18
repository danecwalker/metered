# Metered design system

Soft charcoal by night, warm paper by day. Linear-like density and chrome, without purple and without a true black.

## Authority

| Source | Role |
| --- | --- |
| This file | Contract for tokens, type, motion, and chrome |
| `tokens.css` | Authored semantic tokens (CSS custom properties) |
| Existing routes and class names | Product behavior stays; visuals swap in place |

## Principles

1. Dark paper is charcoal, not void. Light paper is warm, not white.
2. Ink is cream or charcoal — high contrast, but never blasting `#fff` on `#000`.
3. One accent: cream on dark, charcoal on light. No purple, no amber brand.
4. Hairlines, not slabs. Header is text until scroll, then a frosted pill.
5. One grotesque family. Tabular numbers in data.
6. Color never carries meaning alone — pills, labels, and `$ / MU` weight sit with it.

## Token model

Reference → semantic. Components consume semantic names (`--color-paper`, `--color-ink`, `--color-accent`).

`html[data-theme="light"]` remaps the same `--ref-*` names. Default is dark, or the stored / system preference.

| Semantic | Role |
| --- | --- |
| `--color-paper` | App canvas |
| `--color-paper-2` | Raised / row hover |
| `--color-paper-3` | Controls, inset wells |
| `--color-ink` | Primary label |
| `--color-ink-2` | Body |
| `--color-muted` | Meta, captions |
| `--color-accent` | Primary button, `$ / MU` |
| `--color-focus` | Focus ring only |
| `--color-rule` | Hairline |

## Type

- Display and body: Inter (self-hosted variable, latin).
- Mono: JetBrains Mono for data, code, table numbers.
- Headings roman, never italic.

## Shape and material

- Controls ~6px. Cards ~8px. Header pill is fully rounded.
- Nav at rest: no fill. On scroll: frosted pill on `nav__inner`.
- Elevation is a soft veil, not a colored drop shadow.

## Motion

- Transform and opacity only.
- `--ease-out` for enter, `--dur-short` for chrome.
- `prefers-reduced-motion: reduce` collapses spatial motion to ≤150ms opacity.

## Components (keep local)

`btn`, `input`, `nav`, `price-table`, `pill`, `cmdk`, `code-card`, `field`, `alert`, `theme-toggle`.

## Accessibility

- Body and labels ≥ 4.5:1 on paper in both themes.
- Focus ring ≥ 3:1, instant, never animated.
- Touch targets 44px. Reduced motion respected.
