import Link from "next/link";
import content from "@/content";
import SectionWrapper from "./SectionWrapper";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-base-content/5 py-8">
      <SectionWrapper className="flex flex-col items-center gap-4 px-6 text-[13px] text-base-content/50 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Image src={"https://www.tinyshots.app/favicon-96x96.png"} alt="Logo" width={400} height={400} className="h-5 w-5 rounded-md" />
          <span className="font-[family-name:var(--font-gabarito)] font-bold tracking-tight text-base-content/70">{content.appName}</span>
        </div>
        <aside className="flex items-center gap-6">
          <p>
            Copyright &copy; {new Date().getFullYear()} {content.appName}. All
            rights reserved.
          </p>
          <Link href="/tos" className="link link-hover">Terms of Service</Link>
          <Link href="/privacy" className="link link-hover">Privacy Policy</Link>
        </aside>
      </SectionWrapper>
    </footer>
  );
}
