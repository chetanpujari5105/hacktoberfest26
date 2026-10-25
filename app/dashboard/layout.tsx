import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import content from "@/content";
import Header from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
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
