import { redirect } from "next/navigation";
import { auth } from "@/auth";
import config from "@/config";
import content from "@/content";
import GoogleSignInButton from "@/components/GoogleSignInButton";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

function getSafeCallbackUrl(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return config.auth.callbackUrl;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect(config.auth.callbackUrl);
  }

  const params = await searchParams;
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  return (
    <div className="card glass-dark border border-subtle w-full max-w-sm shadow-2xl">
      <div className="card-body items-center text-center gap-6">
        {/* Logo + App Name */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-8 w-8 text-primary"
            >
              <path
                fillRule="evenodd"
                d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{content.appName}</h1>
            <p className="text-base-content/60 text-sm mt-1">
              {content.appTagline}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="divider my-0" />

        {/* Sign In */}
        <div className="w-full space-y-4">
          <p className="text-sm text-base-content/70">
            Sign in to continue to your dashboard
          </p>
          <GoogleSignInButton callbackUrl={callbackUrl} />
        </div>

        {/* Footer */}
        <p className="text-xs text-base-content/40 mt-2">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
