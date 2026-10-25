import Image from "next/image";
import ButtonLead from "./ButtonLead";

export default function CTA() {
  return (
    <section className="pt-6 pb-24 sm:pt-8 sm:pb-32">
      <div className="mx-auto max-w-lg px-6 text-center">
        <Image src={"https://www.tinyshots.app/favicon-96x96.png"} alt="App Logo" width={400} height={400} className="mx-auto mb-8 h-16 w-16 rounded-2xl shadow-lg shadow-base-content/10" />
        <h2 className="font-[family-name:var(--font-gabarito)] text-lg font-bold tracking-tight sm:text-[32px]">
          Stop wasting time on boilerplate
        </h2>
        <p className="mt-3 text-base text-base-content/60">
          Launch your SaaS in days, not months. Join hundreds of makers who
          shipped faster.
        </p>
        <ButtonLead className="mt-8" />
      </div>
    </section>
  );
}
