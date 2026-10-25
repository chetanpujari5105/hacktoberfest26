import themes from "daisyui/theme/object";

/**
 * App configuration for services, auth, and theme.
 * For static content (marketing copy, text), see content.ts
 */

const config = {
  // Stripe
  stripe: {
    // Create multiple plans in your Stripe dashboard, then add them here.
    // You can add as many plans as you want, just make sure to add the priceId.
    plans: [
      {
        priceId:
          process.env.NODE_ENV === "development"
            ? "price_dev_starter"
            : "price_prod_starter",
        name: "Starter",
        description: "Perfect for side projects",
        price: 9,
        priceAnchor: 19,
        features: [
          { name: "All core features" },
          { name: "Up to 1,000 users" },
          { name: "Community support" },
        ],
      },
      {
        priceId:
          process.env.NODE_ENV === "development"
            ? "price_dev_pro"
            : "price_prod_pro",
        name: "Pro",
        description: "For growing businesses",
        price: 49,
        priceAnchor: 99,
        features: [
          { name: "Everything in Starter" },
          { name: "Unlimited users" },
          { name: "Priority support" },
          { name: "Advanced analytics" },
        ],
      },
    ],
  },

  // Mailgun (for sending emails)
  mailgun: {
    // subdomain to use when sending emails, if you don't have a subdomain, just remove it
    subdomain: "mg",
    // email address to send from (eg: "support@yourdomain.com")
    fromNoReply: `ShipNext <noreply@mg.example.com>`,
    // email address to forward support emails to (eg: "support@yourdomain.com")
    fromAdmin: `ShipNext Team <team@mg.example.com>`,
    // email used in the "reply-to" header of support emails
    supportEmail: "support@example.com",
  },

  // NextAuth authentication
  auth: {
    // login page path
    loginUrl: "/login",
    // callback page path after login
    callbackUrl: "/dashboard",
  },

  // DaisyUI theme to use (light, dark, shipnext, cupcake, bumblebee, emerald, etc.)
  // See full list: https://daisyui.com/docs/themes/
  // Custom "shipnext" theme is a dark theme with coral accents
  theme: "shipnext",
  // Available themes from daisyUI
  themes: themes,
} as const;

export default config;
