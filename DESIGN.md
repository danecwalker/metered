# Metered design system

Dark-only instrument surface. **Apple** for materials, type, and hairlines. **Grok** for the void, cream ink, and a single warm accent. Not a light theme, not cobalt-cyber.

## Authority

| Source | Role |
| --- | --- |
| This file | Contract for tokens, type, motion, and chrome |
| `tokens.css` | Authored semantic tokens (CSS custom properties) |
| Existing routes and class names | Product behavior stays; visuals swap in place |
| Public Grok / Apple HIG dark patterns | Derived only — no copied assets or proprietary code |

## Principles

1. Near-black paper with a warm bias. No cool navy wash.
2. One accent. Amber for brand and primary action. System-blue only for focus.
3. Hairline separators, not slabs. Frosted sticky chrome, not a painted bar.
4. SF-adjacent type: one grotesque family, tight display tracking, tabular numbers.
5. Atmosphere is a quiet glow. No scanlines, no HUD grid.
6. Color never carries meaning alone — pills, labels, and `$ / M ET` weight sit with it.

## Token model

Reference → semantic. Components consume semantic names already in the stylesheet (`--color-paper`, `--color-ink`, `--color-accent`).

| Semantic | Role |
| --- | --- |
| `--color-paper` | App canvas |
| `--color-paper-2` | Raised / row hover |
| `--color-paper-3` | Controls, inset wells |
| `--color-ink` | Primary label |
| `--color-ink-2` | Body |
| `--color-muted` | Meta, captions |
| `--color-accent` | Brand, primary button, `$ / M ET` |
| `--color-focus` | Focus ring only (Apple-like blue) |
| `--color-rule` | Hairline |

Dark is the only mode. `color-scheme: dark`.

## Type

- Display / body: Inter Tight + Inter (SF Pro stand-in; we do not ship San Francisco).
- Mono: JetBrains Mono for data, code, table numbers.
- Headings roman, never italic. Tracking −0.03em to −0.05em on display.

## Shape and material

- Control radius ~10px. Cards ~16px. Search and pills fully rounded.
- Nav: translucent paper + `backdrop-filter`.
- Elevation is a soft black veil, not a colored drop shadow.

## Motion

- Transform and opacity only.
- `--ease-out` for enter, `--dur-short` for chrome.
- `prefers-reduced-motion: reduce` collapses spatial motion to ≤150ms opacity.

## Components (keep local)

Do not extract a package. Repeated classes in `globals.css` are the system:

`btn`, `input`, `nav`, `price-table`, `pill`, `cmdk`, `code-card`, `field`, `alert`.

Business tables and eval forms stay in feature pages.

## Accessibility

- Body and labels ≥ 4.5:1 on paper.
- Focus ring ≥ 3:1, instant, never animated.
- Touch targets 44px. Reduced motion respected.
