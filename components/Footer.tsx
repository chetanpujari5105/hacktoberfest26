import content from "@/content";
import LogoMark from "@/components/leaseguard/LogoMark";
import SectionWrapper from "./SectionWrapper";

export default function Footer() {
  return (
    <footer className="border-t border-base-content/5 py-8">
      <SectionWrapper className="flex flex-col items-center gap-3 px-6 text-[13px] text-base-content/70 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="h-4.5 w-4.5 text-primary" />
          <span className="font-semibold tracking-tight text-base-content/80">{content.appName}</span>
        </div>
        <p>
          &copy; {new Date().getFullYear()} {content.appName}. Pausing stops compute billing; storage is still billed.
        </p>
      </SectionWrapper>
    </footer>
  );
}
