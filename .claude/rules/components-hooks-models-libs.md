# Components, Hooks, Models, Libs

## Components (`components/`)

- Must be **reusable** — used in 2+ places, or designed to be
- One component per file
- File name = component name in PascalCase: `components/PricingCard.tsx`
- Page-specific UI that isn't reusable stays in the `app/` route folder, not in `components/`

## Hooks (`hooks/`)

- File name pattern: `hooks/use<Name>.ts` (e.g., `hooks/useAuth.ts`)
- A hook used by only one component can live in that component's file
- Extract to `hooks/` once shared by 2+ files
- All hooks are client-side — files using them need `"use client"`

## Models (`models/`)

- One file per Mongoose model: `models/User.ts`, `models/Product.ts`
- Export the model as default export
- Export the TypeScript interface for the document shape as a named export

```ts
// models/User.ts
export interface IUser { email: string; name: string; }
const UserSchema = new Schema<IUser>({ ... });
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
```

## Libs (`libs/`)

- One file per external service: `libs/stripe.ts`, `libs/mailgun.ts`, `libs/mongoose.ts`
- Thin wrappers around third-party SDKs — initialize client, export helper functions
- Server-only by default — add `import "server-only"` at the top when the file should never be bundled for the browser
- Read secrets from `process.env` inside these files, not from `config.ts`
