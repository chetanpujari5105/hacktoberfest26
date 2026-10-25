# Tailwind CSS 4 + daisyUI 5

## Tailwind v4 — CSS-based config

- Configuration lives in `app/globals.css`, not in a JS/TS config file
- Use `@import "tailwindcss"` — never `@tailwind base`, `@tailwind components`, `@tailwind utilities`
- Design tokens go in the `@theme inline {}` block in `globals.css`
- Do not create `tailwind.config.js` or `tailwind.config.ts`

## daisyUI component classes

- Prefer daisyUI classes (`btn`, `card`, `modal`, `badge`, `input`, `navbar`, etc.) over raw Tailwind utilities when a matching component exists
- Theme is set in `config.ts` under `config.theme`
- Available themes are imported from `daisyui/theme/object`

## Dark mode

- Uses CSS `prefers-color-scheme: dark` media query in `globals.css`
- Light/dark colors defined as CSS custom properties (`--background`, `--foreground`)

## Class ordering convention

When combining daisyUI classes with Tailwind utilities, follow this order:

1. daisyUI component class (`btn`, `card`, `badge`, `navbar`)
2. daisyUI modifiers (`btn-primary`, `btn-lg`, `card-compact`)
3. Layout utilities (`flex`, `grid`, `items-center`, `gap-*`, `w-*`)
4. Spacing utilities (`px-*`, `py-*`, `mb-*`, `mt-*`)
5. Visual utilities (`rounded-*`, `border-*`, `shadow-*`)
6. Responsive prefixes (`lg:`, `md:`, `sm:`)
7. Conditional/custom utilities last

```tsx
// Correct
<button className="btn btn-primary w-full rounded-full lg:w-auto">

// Wrong — modifiers scattered, no order
<button className="rounded-full btn w-full btn-primary lg:w-auto">
```

## Overriding component styles

### Theme-scoped overrides (preferred)

Override daisyUI defaults by scoping to the theme selector in `globals.css`:

```css
[data-theme="shipnext"] .btn-primary {
  background-color: var(--color-primary);
  color: var(--color-primary-content);
}

[data-theme="shipnext"] .btn-primary:hover {
  background-color: var(--color-coral-hover);
}
```

### Global component overrides

For behavior that applies across all themes:

```css
.btn {
  border-radius: var(--rounded-btn);
  transition: all 0.1s ease-in-out;
}

.btn:active {
  transform: scale(0.98);
}
```

### Rules for overrides

- Define all overrides in `globals.css`, never in component files
- Use CSS custom properties from the theme block, not hardcoded values
- Never use `!important` to override daisyUI styles
- Always test in the target theme (`shipnext`)

## Custom utilities

Define reusable utilities with the `@utility` directive in `globals.css`:

```css
@utility glass-dark {
  background: rgba(22, 22, 26, 0.8);
  backdrop-filter: blur(12px);
}

@utility border-subtle {
  border-color: rgba(255, 255, 255, 0.05);
}
```

Use alongside daisyUI classes: `<div className="card glass-dark border-subtle">`

## Color and opacity patterns

Use daisyUI semantic color classes with opacity modifiers:

```tsx
// Base content colors
<p className="text-base-content">Full opacity</p>
<p className="text-base-content/70">70% opacity for secondary text</p>
<p className="text-base-content/50">50% opacity for muted text</p>

// Background colors
<div className="bg-base-100">Card background</div>
<div className="bg-base-200">Section background</div>

// Borders with opacity
<div className="border border-base-content/10">Subtle border</div>
<div className="border border-primary/50">Accent border</div>
```

## Anti-patterns

- Overriding daisyUI classes in component files with inline styles
- Using arbitrary color values instead of theme tokens
- Mixing multiple button styling approaches (pick daisyUI or custom, not both)
- Creating parallel component classes that duplicate daisyUI functionality
