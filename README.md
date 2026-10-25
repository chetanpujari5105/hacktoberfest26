# ShipNext

A production-ready Next.js 16 SaaS starter template. Ship your product in days, not weeks.

## Features

- **Next.js 16** with App Router and React 19
- **Tailwind CSS 4** with CSS-based configuration
- **daisyUI 5** component library with custom dark theme
- **NextAuth.js** with Google OAuth and Prisma adapter
- **Prisma ORM** with PostgreSQL/SQLite support
- **Stripe** payments integration (ready to configure)
- **Mailgun** email integration (ready to configure)
- **TypeScript 5** with strict mode
- **ESLint 9** with flat config

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/shipnext.git
cd shipnext

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Set up the database
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Your app URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `GOOGLE_ID` | Google OAuth client ID |
| `GOOGLE_SECRET` | Google OAuth client secret |
| `DATABASE_URL` | Prisma connection string |
| `STRIPE_PUBLIC_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `MAILGUN_API_KEY` | Mailgun API key (optional) |

## Project Structure

```
app/                  # Next.js App Router
├── layout.tsx        # Root layout with fonts and auth
├── page.tsx          # Landing page
├── globals.css       # Tailwind + theme configuration
├── api/              # API routes
├── login/            # OAuth login page
└── dashboard/        # Protected dashboard

components/           # Reusable React components
├── Header.tsx        # Navigation with auth
├── Hero.tsx          # Hero section
├── Pricing.tsx       # Pricing cards
├── FAQ.tsx           # FAQ accordion
└── ui/               # UI primitives

libs/                 # Service wrappers
prisma/               # Database schema
hooks/                # Custom React hooks
config.ts             # App configuration
content.ts            # Marketing copy
```

## Customization

### Theme

The custom `shipnext` theme is defined in `app/globals.css`. Modify the CSS custom properties under `[data-theme="shipnext"]` to customize colors.

### Content

Update `content.ts` to change:
- App name and tagline
- Feature descriptions
- Pricing plans
- FAQ questions

### Configuration

Update `config.ts` to configure:
- Stripe plans and pricing
- Mailgun email settings
- Auth URLs

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Deploy

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/shipnext)

## License

MIT
