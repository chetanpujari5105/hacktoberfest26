import Link from "next/link";
import { auth } from "@/auth";
import content from "@/content";
import ButtonSignIn from "@/components/ButtonSignIn";
import LogoMark from "@/components/leaseguard/LogoMark";
import SectionWrapper from "./SectionWrapper";

export default async function Header() {
  const session = await auth();

  return (
    <header className="top-0 z-40 w-full">
      <nav aria-label="Main" className="z-50 w-full border-b border-base-content/5 bg-base-100/80 backdrop-blur-xl">
        <SectionWrapper className="navbar h-14 px-6">
          <div className="navbar-start">
            <Link href="/" className="flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight">
              <LogoMark className="h-5.5 w-5.5 text-primary" />
              {content.appName}
            </Link>
          </div>
          <div className="navbar-end gap-1">
            <Link href="#how-it-works" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              How it works
            </Link>
            {session?.user ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                Open dashboard
              </Link>
            ) : (
              <ButtonSignIn />
            )}
          </div>
        </SectionWrapper>
      </nav>
    </header>
  );
}
