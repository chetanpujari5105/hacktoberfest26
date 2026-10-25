# App Router Conventions

This project uses Next.js 16 App Router exclusively. No `pages/` directory.

## Server vs Client components

- All components are **server components by default**
- Add `"use client"` only when the component uses: `useState`, `useEffect`, `useRef`, event handlers (`onClick`, `onChange`), or browser APIs (`window`, `document`)
- Never add `"use client"` "just in case"

## Route structure

- One route = one folder under `app/` containing `page.tsx`
- Optional co-located files per route: `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Example: `app/dashboard/page.tsx` → renders at `/dashboard`
- Example: `app/dashboard/settings/page.tsx` → renders at `/dashboard/settings`

## API routes

- Location: `app/api/<name>/route.ts`
- Export named HTTP method functions: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Always return `NextResponse.json()`
- Validate request bodies before processing
- Access secrets via `process.env` in route handlers, not from `config.ts`

## Next.js 16 docs

Before using any Next.js API, read the bundled docs at `node_modules/next/dist/docs/01-app/`. Training data may be outdated.
