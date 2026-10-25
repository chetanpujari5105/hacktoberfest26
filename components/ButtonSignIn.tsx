import Link from "next/link";
import config from "@/config";
import { isAuthDisabled } from "@/libs/authMode";

export default function ButtonSignIn() {
  if (isAuthDisabled()) {
    return (
      <Link href={config.auth.callbackUrl} className="btn btn-primary btn-sm">
        Open dashboard
      </Link>
    );
  }
  return (
    <Link href={config.auth.loginUrl} className="btn btn-ghost btn-sm">
      Sign In
    </Link>
  );
}
