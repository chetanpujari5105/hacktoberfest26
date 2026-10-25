import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import content from "@/content";
import LogoMark from "@/components/leaseguard/LogoMark";

/** Top bar for the signed-in console. */
export default async function ConsoleHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-base-content/[0.06] bg-base-100/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 rounded-md font-semibold tracking-tight">
          <LogoMark className="h-5.5 w-5.5 text-primary" />
          <span>{content.appName}</span>
        </Link>
        {user && (
          <div className="flex items-center gap-2">
            {user.image ? (
              <Image src={user.image} alt="" width={26} height={26} className="rounded-full" />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-6.5 w-6.5 place-items-center rounded-full bg-base-300 text-xs font-semibold"
              >
                {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-40 truncate text-sm text-base-content/80 sm:inline">
              {user.name ?? user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn btn-ghost btn-sm gap-1.5" aria-label="Sign out">
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
