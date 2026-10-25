# File Placement

Every file has exactly one correct location. Do not create new top-level directories without explicit approval.

## Where code goes

- **Page or layout** → `app/` (nested folders = nested routes)
- **API route handler** → `app/api/<name>/route.ts`
- **Reusable UI component** → `components/<ComponentName>.tsx`
- **Library/service helper** → `libs/<service>.ts`
- **Mongoose schema/model** → `models/<ModelName>.ts`
- **Custom React hook** → `hooks/use<Name>.ts`
- **App-wide config value** → `config.ts`
- **Secret/credential** → `.env.local` (update `.env.example` when adding new vars)

## Wrong placements that must be caught

- Components in `app/`, `libs/`, or root
- API logic in `libs/` or `components/`
- Mongoose models in `libs/` or `app/`
- Hooks inline in `components/` when used by 2+ files
- Config values hardcoded in components instead of `config.ts`
- Secrets in `config.ts` or hardcoded anywhere
