import { BellRing, Radar, Save, type LucideIcon } from "lucide-react";
import content from "@/content";
import SectionWrapper from "./SectionWrapper";

const ICONS: LucideIcon[] = [Radar, BellRing, Save];

export default function HowItWorks() {
  const { headline, steps } = content.howItWorks;
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="border-t border-base-content/[0.06] py-20 sm:py-24">
      <SectionWrapper className="px-6">
        <h2 id="how-heading" className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
          {headline}
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <li key={item.step} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-base-200 text-primary ring-1 ring-base-content/[0.08]">
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-sm font-semibold">{item.step}</span>
                  {i < steps.length - 1 && (
                    <span aria-hidden="true" className="ml-2 hidden h-px flex-1 bg-base-content/10 md:block" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-base-content/75">{item.description}</p>
              </li>
            );
          })}
        </ol>
      </SectionWrapper>
    </section>
  );
}
