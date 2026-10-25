# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint 9 flat config (eslint.config.mjs)
```

## Tech Stack

- **Next.js 16.2.1** (App Router) — React 19, TypeScript 5 (strict mode)
- **Tailwind CSS 4** via `@tailwindcss/postcss` — configured in CSS, not JS
- **daisyUI 5** — component utility classes
- **Gabarito** font (sans) + Geist Mono via `next/font/google`
- **Path alias:** `@/*` maps to project root

### Integrations

- **NextAuth** (Google OAuth) + Prisma adapter
- **Prisma** ORM with PostgreSQL/SQLite
- **Stripe** (payments) — ready to configure
- **Mailgun** (email) — ready to configure

## Critical: Next.js 16 Breaking Changes

**Always read `node_modules/next/dist/docs/` before writing any code.** Do not rely on training data.

- `node_modules/next/dist/docs/01-app/` — App Router docs
- `node_modules/next/dist/docs/01-app/03-api-reference/` — API reference

## Project Structure

```
app/              → App Router: pages, layouts, route handlers
  layout.tsx      → Root layout (fonts, html/body)
  page.tsx        → Home page (server component)
  globals.css     → Tailwind import + @theme tokens + CSS custom properties
  api/route.ts    → Health check (GET /api → { status: "ok" })
  login/          → OAuth login page
  dashboard/      → Protected dashboard (authenticated users only)
components/       → Reusable React components
libs/             → Service wrappers (Stripe, Mailgun, Prisma client)
prisma/           → Prisma schema and migrations
hooks/            → Custom React hooks (client-side)
config.ts         → App config (Stripe plans, Mailgun, auth, daisyUI theme)
content.ts        → Static content (marketing copy, taglines, feature steps)
.env.local        → Secrets (copy from .env.example, never committed)
.env.example      → Template for required env vars (committed)
```

## Key Files

- **`config.ts`** — App configuration: `stripe.plans[]`, `mailgun`, `auth.loginUrl`, `auth.callbackUrl`, `theme`. Import as `@/config`.
- **`content.ts`** — Static content: `appName`, `appTagline`, `appDescription`, `featurelisticleSteps`. Import as `@/content`.
- **`app/globals.css`** — `@import "tailwindcss"` + `@theme inline {}` block for design tokens. Custom `shipnext` theme.
- **`.env.local`** — `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_ID`, `GOOGLE_SECRET`, `DATABASE_URL`, `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAILGUN_API_KEY`
