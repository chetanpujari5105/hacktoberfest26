import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Header from "@/components/Header";
import { isAuthDisabled } from "@/libs/authMode";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = isAuthDisabled() ? null : await auth();
  if (!isAuthDisabled() && !session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dashboard Navbar */}
      <Header />

      {/* Main Content */}
      <main className="w-full max-w-[1100px] p-4 mx-auto">{children}</main>
    </div>
  );
}
