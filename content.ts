/**
 * Static content for marketing pages and UI copy.
 * For app configuration (services, auth, theme), see config.ts
 */

export const content = {
  // App identity
  appName: "LeaseGuard",
  appTagline: "Stop paying for idle GPUs",

  // SEO description
  appDescription:
    "LeaseGuard watches your JarvisLabs GPU runs — utilization, memory, processes and training logs — and asks you on Telegram before it checkpoints and pauses anything that has gone quiet.",

  // Domain (no https://, no trailing slash)
  domainName: "",

  // Landing page: how it works
  howItWorks: {
    headline: "Evidence first, then a decision, then a safe pause.",
    steps: [
      {
        step: "Probe",
        title: "Read what the GPU is actually doing",
        description:
          "On a schedule you choose, the guard checks GPU utilization, memory, the training process and the latest log lines. Not a timer — evidence.",
      },
      {
        step: "Decide",
        title: "Ask you before acting",
        description:
          "When a run looks idle or stuck, you get a Telegram message with the evidence and three buttons: Pause, Keep 30 min, or Extend.",
      },
      {
        step: "Pause safely",
        title: "Checkpoint, then stop billing",
        description:
          "No answer before the deadline and your policy allows it? LeaseGuard saves a checkpoint, then pauses. Compute billing stops; storage is still billed.",
      },
    ],
  },
} as const;

export default content;
