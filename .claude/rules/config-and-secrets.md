# Configuration & Secrets

## `config.ts` — app settings only

- All non-secret, app-wide settings live in `config.ts`: feature names, plan definitions, email addresses, theme, URLs
- Import as `import config from "@/config"`
- Never put `process.env` reads in `config.ts`
- Never scatter config across multiple files

## `.env.local` — secrets only

- API keys, database URIs, OAuth credentials, webhook secrets
- Access via `process.env.VAR_NAME` at runtime in server code
- Never import or re-export env vars through `config.ts`
- Never expose secrets to client components (only `NEXT_PUBLIC_` prefixed vars reach the browser)

## When adding a new env var

1. Add it to `.env.local`
2. Add the same key (empty value) to `.env.example`
3. Document what it's for in a comment in `.env.example` if not obvious
