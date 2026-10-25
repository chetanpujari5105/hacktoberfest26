import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, image } = session.user;

  return (
    <div className="layout space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{name ? `, ${name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-base-content/60 mt-1">
          Here&apos;s your dashboard overview.
        </p>
      </div>

      {/* Profile Card */}
      <div className="card glass-dark border border-subtle max-w-md">
        <div className="card-body">
          <h2 className="card-title text-lg">Your Profile</h2>
          <div className="flex items-center gap-4 mt-2">
            {image && (
              <Image
                src={image}
                alt={name ?? "User avatar"}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <div>
              {name && <p className="font-semibold text-lg">{name}</p>}
              {email && (
                <p className="text-sm text-base-content/60">{email}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Projects", "Activity", "Settings"].map((title) => (
          <div key={title} className="card glass-dark border border-subtle">
            <div className="card-body">
              <h3 className="card-title text-base">{title}</h3>
              <p className="text-3xl font-bold text-primary">—</p>
              <p className="text-xs text-base-content/40">Add your content here</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
