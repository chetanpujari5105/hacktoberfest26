import Image from "next/image";
import Link from "next/link";
import content from "@/content";
import config from "@/config";
import { auth, signOut } from "@/auth";
import ButtonSignIn from "@/components/ButtonSignIn";
import SectionWrapper from "./SectionWrapper";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export default async function Header() {
  const session = await auth();

  return (
    <header className="top-0 z-40 w-full">
      <nav className="z-50 w-full border-b border-base-content/5 bg-base-100/80 backdrop-blur-xl">
        <SectionWrapper className="navbar h-14">
          {/* Left: hamburger (mobile) + logo */}
          <div className="navbar-start">
            <div className="dropdown">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle lg:hidden"
                aria-label="Open menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu menu-sm bg-base-200 rounded-box z-50 mt-3 w-56 p-3 shadow-lg border border-base-content/5"
              >
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-base font-medium py-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className="mt-2">
                  {session?.user ? (
                    <form
                      action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/" });
                      }}
                    >
                      <button type="submit" className="text-base font-medium py-2 w-full text-left">
                        Sign Out
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={config.auth.loginUrl}
                      className="text-base font-medium py-2"
                    >
                      Sign In
                    </Link>
                  )}
                </li>
              </ul>
            </div>

            <Link href="/" className="flex gap-2 text-xl font-bold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6 text-primary"
              >
                <path
                  fillRule="evenodd"
                  d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
                  clipRule="evenodd"
                />
              </svg>
              {content.appName}
            </Link>
          </div>

          {/* Center: nav links (desktop only) */}
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal gap-1 px-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: CTAs */}
          <div className="navbar-end gap-2">
            {session?.user ? (
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium">{session.user.name}</span>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Sign Out
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="hidden lg:flex">
                  <ButtonSignIn />
                </div>
              </>
            )}
          </div>
        </SectionWrapper>
      </nav>
    </header>
  );
}
