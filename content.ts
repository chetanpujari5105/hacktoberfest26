/**
 * Static content for marketing pages and UI copy.
 * For app configuration (services, auth, theme), see config.ts
 */

export const content = {
  // App identity
  appName: "ShipNext",
  appTagline: "Ship your SaaS",
  appTagSubline: "in days.",
  appTaglineHighlight: "Not weeks.",

  // SEO description
  appDescription:
    "A production-ready Next.js 16 starter template with authentication, payments, and everything you need to launch your SaaS fast.",

  // Domain (no https://, no trailing slash)
  domainName: "",

  // Feature listicle steps for landing page
  featurelisticleSteps: [
    {
      step: "Clone",
      title: "Start with a solid foundation.",
      description:
        "Clone the repo and you're ready to go. Next.js 16, Tailwind CSS 4, daisyUI 5, and TypeScript already configured.",
      image: "",
    },
    {
      step: "Customize",
      title: "Make it yours.",
      description:
        "Update the theme, branding, and content. Everything is organized and documented for easy customization.",
      image: "",
    },
    {
      step: "Launch",
      title: "Deploy and start earning.",
      description:
        "Authentication, payments, and email are pre-wired. Just add your API keys and deploy to Vercel.",
      image: "",
    },
  ],

  // Pricing section
  pricing: {
    headline: "Simple, transparent pricing.",
    subheadline: "Start building today. Scale when you're ready.",
    plans: [
      {
        name: "Starter",
        price: 9,
        period: "/month",
        features: [
          "All core features",
          "Up to 1,000 users",
          "Community support",
        ],
        buttonText: "Get Started",
        isFeatured: false,
      },
      {
        name: "Pro",
        price: 49,
        period: "/month",
        badge: "MOST POPULAR",
        features: [
          "Everything in Starter",
          "Unlimited users",
          "Priority support",
          "Advanced analytics",
          "Custom integrations",
        ],
        buttonText: "Upgrade to Pro",
        isFeatured: true,
      },
    ],
  },

  // FAQ
  faqs: {
    headline: "Frequently Asked Questions",
    subheadline: "",
    questions: [
      {
        question: "What's included in the template?",
        answer:
          "Everything you need to launch a SaaS: Next.js 16 App Router, Tailwind CSS 4, daisyUI 5, NextAuth.js, Prisma ORM, Stripe payments, and Mailgun email integration.",
      },
      {
        question: "Can I use this for commercial projects?",
        answer:
          "Yes! You have full rights to use this template for personal and commercial projects. No attribution required.",
      },
      {
        question: "How do I get support?",
        answer:
          "Starter plans have access to community support via Discord. Pro plans include priority email support with faster response times.",
      },
    ],
  },
} as const;

export default content;
