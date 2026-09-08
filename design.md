# Almadox Design System

## Philosophy
Technical + verified-identity personality. Disciplined and premium, not loud.
One accent drives the whole UI. Identity/wallet elements get a second color — used sparingly.

---

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg-raw` | `#0A0B0D` | Page background |
| `--surface-raw` | `#14161A` | Cards, surfaces |
| `--line-raw` | `#2A2D33` | Hairline borders, dividers |
| `--accent-raw` | `#3DDC84` | Primary CTAs, verified state, success |
| `--accent-2-raw` | `#B98CFF` | Identity / SBT / Wallet UI **only** |
| `--text-raw` | `#F2F3F5` | Primary text |
| `--muted-raw` | `#8A8F98` | Secondary text, descriptions |

---

## Typography

| Use case | Font | Notes |
|---|---|---|
| Body copy, paragraphs, descriptions | **Inter** | `font-family: "Inter", system-ui, sans-serif` |
| Headlines (h1–h6), labels, stat numbers | **JetBrains Mono** | Monospace — technical feel without shouting |

**Rule**: Monospace is reserved for headings, chip labels, and numeric/stat displays. Body text must be Inter.

---

## Color Rules

1. **One primary accent** — `#3DDC84` (green) drives all primary CTAs, verified indicators, and interactive states.
2. **Identity purple** — `#B98CFF` appears **only** on wallet, SBT, and identity-specific UI. Never on generic buttons or section headings.
3. No neon glow on cards. Cards use `border: 1px solid #2A2D33` + soft depth shadow only.

---

## Card System (single style)

```css
.almadox-card {
  background: #14161A;
  border: 1px solid #2A2D33;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25);
}
```

**One card style used site-wide.** No mixing bordered + glowing + plain boxes.

Exception: `.identity-card` — same card but with a subtle purple border/glow, used only for wallet and SBT sections.

---

## Button Hierarchy

| Class | Purpose |
|---|---|
| `.btn-primary` | Main CTA — green fill, mono font |
| `.btn-ghost` | Secondary/alternative — hairline border, no fill |

Never put 3 CTAs of equal visual weight on the same screen section.

---

## Hero Section

- **Visual**: Verification medallion (coin) that rotates in 3D via CSS `rotateY`.
- **Headline**: Short, sentence case, JetBrains Mono.
- **CTAs**: One primary ("Get started") + one ghost ("See how it works").
- **Stats**: Displayed in a card below copy using `stat-num` (mono) class.
- **Reduced motion**: coin rotation pauses via `useReducedMotion()`.

---

## Animations

| Name | Usage |
|---|---|
| `coin-rotate` | Hero medallion — 10s linear loop |
| `float` | Subtle vertical bob — 6s ease |
| `fade-in` / `slide-in-right` | Page transitions |

All animations are suppressed under `prefers-reduced-motion: reduce`.

---

## Responsive Breakpoints

Standard Tailwind breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).
Mobile-first grid layouts. No horizontal scroll at any viewport.

---

## Focus / Accessibility

- All interactive elements have visible `focus-visible` outlines using `outline: 2px solid #3DDC84`.
- Keyboard navigation supported throughout.
- All images have meaningful `alt` text.
- `aria-hidden` on decorative elements.
