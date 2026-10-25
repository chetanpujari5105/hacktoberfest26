import themes from "daisyui/theme/object";

/**
 * App configuration for services, auth, and theme.
 * For static content (marketing copy, text), see content.ts
 *
 * Note: this file pulls in the daisyUI theme map, so client components
 * should receive values from here as props instead of importing it.
 */

const config = {
  // Mailgun (for sending emails)
  mailgun: {
    // subdomain to use when sending emails, if you don't have a subdomain, just remove it
    subdomain: "mg",
    // email address to send from (eg: "support@yourdomain.com")
    fromNoReply: `LeaseGuard <noreply@mg.example.com>`,
    // email address to forward support emails to (eg: "support@yourdomain.com")
    fromAdmin: `LeaseGuard Team <team@mg.example.com>`,
    // email used in the "reply-to" header of support emails
    supportEmail: "support@example.com",
  },

  // LeaseGuard dashboard behaviour
  leaseguard: {
    // How often the dashboard re-fetches runs and the wallet
    pollIntervalMs: 3000,
    // Snooze length for "Keep" / "Extend" buttons
    snoozeMinutes: 30,
    // Cheaper GPU offered on the "Resume on ..." button
    resumeGpuOption: "L4",
    // Pre-filled hourly cost (₹) in the "Guard a run" form; A30 on-demand rate
    defaultHourlyCostInr: 38.88,
  },

  // NextAuth authentication
  auth: {
    // login page path
    loginUrl: "/login",
    // callback page path after login
    callbackUrl: "/dashboard",
  },

  // LeaseGuard dashboard behaviour (non-secret)
  leaseguard: {
    // Client polling cadence
    pollIntervalMs: { dashboard: 15_000, runDetail: 10_000 },
    // Longest backoff after repeated polling errors
    maxBackoffMs: 120_000,
    // Timeout for BFF -> FastAPI requests
    backendTimeoutMs: 8_000,
    // "Keep running" snooze length
    keepMinutes: 30,
    // Lease extension choices shown in the UI, and the bounds the BFF accepts
    extendMinuteOptions: [15, 30, 60, 120],
    extendMinutesRange: { min: 5, max: 240 },
    // GPU types accepted by "Resume on another GPU"
    gpuTypes: [
      { value: "H100-80GB", label: "H100 80GB" },
      { value: "A100-80GB", label: "A100 80GB" },
      { value: "A100-40GB", label: "A100 40GB" },
      { value: "RTX6000-Ada", label: "RTX 6000 Ada" },
      { value: "A6000", label: "RTX A6000" },
      { value: "A5000", label: "RTX A5000" },
      { value: "L4", label: "L4" },
    ],
  },

  // DaisyUI theme to use (light, dark, shipnext, cupcake, bumblebee, emerald, etc.)
  // See full list: https://daisyui.com/docs/themes/
  // Custom "shipnext" theme is a dark graphite theme with coral accents
  theme: "shipnext",
  // Available themes from daisyUI
  themes: themes,
} as const;

export default config;
