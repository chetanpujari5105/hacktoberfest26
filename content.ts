/**
 * Static content for marketing pages and UI copy.
 * For app configuration (services, auth, theme), see config.ts
 */

export const content = {
  // App identity
  appName: "LeaseGuard",
  appTagline: "Stop paying for",
  appTagSubline: "idle GPUs.",
  appTaglineHighlight: "Keep your work.",

  // SEO description
  appDescription:
    "LeaseGuard watches your Jarvislabs training runs, uses Gemma 4 to tell finished runs from broken ones, checkpoints and pauses the finished ones, and hands broken ones to Kepler to diagnose.",

  // Domain (no https://, no trailing slash)
  domainName: "",

  // Feature listicle steps for landing page
  featurelisticleSteps: [
    {
      step: "Watch",
      title: "Every run gets a durable guard.",
      description:
        "A Temporal workflow probes GPU utilisation and your training log, and survives crashes and restarts.",
      image: "",
    },
    {
      step: "Judge",
      title: "Gemma 4 reads the loss curve.",
      description:
        "Finished, still learning, or broken? Gemma 4 looks at the chart, GPU stats and logs, and decides with a function call.",
      image: "",
    },
    {
      step: "Act",
      title: "Checkpoint, pause, or triage.",
      description:
        "Finished runs are checkpointed and paused. Broken runs go to Kepler for diagnosis. Resume later on a cheaper GPU.",
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
        question: "Will LeaseGuard kill my training?",
        answer:
          "No. It checkpoints before pausing, asks you on Telegram first, and never pauses a run that looks broken; those go to Kepler for diagnosis.",
      },
      {
        question: "Which GPU clouds are supported?",
        answer:
          "Jarvislabs today, through its SDK and the jl CLI. The provider interface makes other clouds a small addition.",
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
