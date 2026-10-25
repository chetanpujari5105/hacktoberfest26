# Fonts

## Current fonts

- **Sans (primary):** Gabarito (variable, 400–900) via `--font-gabarito`
- **Mono:** Geist Mono via `--font-geist-mono`

## Standard procedure to add or change a font

### Step 1: Import in `app/layout.tsx`

```tsx
import { FontName } from "next/font/google";

const fontName = FontName({
  variable: "--font-font-name",
  subsets: ["latin"],
  weight: "variable",   // for variable fonts — loads the full weight axis
  display: "swap",
});
```

- Import from `next/font/google` (self-hosted at build time, no runtime Google requests)
- Use the `variable` option to register a CSS custom property
- For variable fonts: set `weight: "variable"` to get the full axis
- For static fonts: pass an array of specific weights like `weight: ["400", "700"]`
- Always set `display: "swap"` to prevent FOIT (flash of invisible text)

### Step 2: Apply the CSS variable on `<html>`

Add `fontName.variable` to the `<html>` className in `app/layout.tsx`:

```tsx
<html className={`${gabarito.variable} ${geistMono.variable} ${newFont.variable}`}>
```

### Step 3: Wire up in `app/globals.css`

Map the CSS variable to a Tailwind v4 design token in the `@theme inline` block:

```css
@theme inline {
  --font-sans: var(--font-gabarito);
  --font-mono: var(--font-geist-mono);
  --font-display: var(--font-new-name);  /* custom token */
}
```

Then use via Tailwind classes: `font-sans`, `font-mono`, or `font-display`.

## Rules

- Never load fonts via `<link>` tags or CSS `@import url()` — always use `next/font/google`
- Never use `className` approach — always use `variable` + CSS custom property for Tailwind v4 integration
- Register every font variable in `@theme inline` in `globals.css`
- Apply all font variables on `<html>` in `layout.tsx` — not on `<body>` or deeper elements
