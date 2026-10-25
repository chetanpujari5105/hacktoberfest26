import content from "@/content";
import ButtonLead from "./ButtonLead";
import Image from "next/image";
import { images } from "@/public";

export default function Hero() {
  return (
    <section
      id="hero"
      className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-20 px-8 py-8 lg:py-20 pb-20 lg:pb-24"
    >
      <div className="flex flex-col gap-10 lg:gap-14 items-center justify-center text-center lg:text-left lg:items-start">
        <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight md:-mb-4 flex flex-col gap-3 items-center lg:items-start">
          {content.appTagline}
          <span>
            {content.appTagSubline}{" "}
            <span className="text-primary">{content.appTaglineHighlight}</span>
          </span>
        </h1>
        <p className="text-lg opacity-80 leading-relaxed text-base-content/70">
          {content.appDescription}
        </p>
        <ButtonLead />
      </div>
      <div className="relative max-md:-m-4 lg:w-full">
        <Image
          src={images.heroImage}
          className="w-full max-w-xl ml-auto"
          fetchPriority="high"
          height={1000}
          width={1000}
          alt="Hero Image"
        />
      </div>
    </section>
  );
}
