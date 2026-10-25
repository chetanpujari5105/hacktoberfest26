import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import content from "@/content";
import ConsoleHeader from "@/components/leaseguard/ConsoleHeader";
import ToastProvider from "@/components/leaseguard/ToastProvider";

export const metadata: Metadata = {
  title: { default: `GPU runs · ${content.appName}`, template: `%s · ${content.appName}` },
  description: content.appDescription,
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="btn btn-primary btn-sm sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <ConsoleHeader />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-6 pb-16 outline-none sm:px-6 sm:pt-8"
        >
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
