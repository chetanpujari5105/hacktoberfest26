import { Rocket, CreditCard, Shield, Database } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import content from "@/content";

const features = [
  {
    title: "Emails",
    description: "Send transactional emails with Mailgun in minutes.",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    title: "Payments",
    description: "Accept one-time and recurring payments with Stripe.",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Authentication",
    description: "Google OAuth and session management with NextAuth.",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    title: "Database",
    description: "Prisma ORM with PostgreSQL or SQLite for flexible data modeling.",
    icon: <Database className="h-5 w-5" />,
  },
] as const;

export default function FeaturesListicle() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <SectionWrapper className="px-6">
        {/* Feature Grid */}
        <h2 className="text-3xl font-bold text-center mb-4">
          Everything you need to ship fast
        </h2>
        <p className="text-center text-base-content/60 mb-12 max-w-xl mx-auto">
          Stop reinventing the wheel. Focus on what makes your product unique.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {features.map((feature) => (
            <div key={feature.title} className="card bg-base-200">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <div className="badge badge-primary badge-lg p-3">
                    {feature.icon}
                  </div>
                  <h3 className="card-title">{feature.title}</h3>
                </div>
                <p className="text-base-content/70">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Step-by-step Listicle */}
        {content.featurelisticleSteps.map((item, index) => (
          <div
            key={index}
            className="mt-16 first:mt-0 grid items-center gap-12 lg:grid-cols-2 lg:gap-20 even:[&>div:first-child]:order-last"
          >
            <div>
              <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-base-content/50">
                {item.step}
              </p>
              <h2 className="font-[family-name:var(--font-gabarito)] text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
                {item.title}
              </h2>
              <p className="mt-4 text-base text-base-content/70">
                {item.description}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-200 aspect-video flex items-center justify-center">
              <p className="text-base-content/40 text-sm">
                Image placeholder
              </p>
            </div>
          </div>
        ))}
      </SectionWrapper>
    </section>
  );
}
