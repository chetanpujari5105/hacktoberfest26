import content from "@/content";

export default function Pricing() {
  const { headline, subheadline, plans } = content.pricing;

  return (
    <section id="pricing" className="py-24 bg-base-200">
      <div className="max-w-5xl mx-auto px-8">
        <h2 className="text-4xl font-bold text-center mb-4">{headline}</h2>
        <p className="text-center text-base-content/60 mb-16 max-w-xl mx-auto">
          {subheadline}
        </p>
        <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8 py-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative card bg-base-100 w-full lg:w-96 rounded-2xl border ${plan.isFeatured
                ? "border-primary/50 shadow-[0_0_40px_-10px_rgba(199,146,234,0.3)]"
                : "border-base-content/10"
                }`}
            >
              <div className="card-body p-8">
                <h3 className="text-xl font-bold text-base-content">
                  {plan.name}
                </h3>
                <div className="mt-4 mb-6">
                  <span className="text-5xl font-bold text-base-content">
                    ${plan.price}
                  </span>
                  <span className="text-base-content/50 ml-1">
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        className={
                          plan.isFeatured
                            ? "text-base-content font-medium"
                            : "text-base-content/80"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="card-actions">
                  <button
                    className={`btn w-full rounded-full ${plan.isFeatured
                      ? "btn-primary"
                      : "btn-outline border-base-content/20 hover:bg-base-content/10 hover:border-base-content/30"
                      }`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
