import Link from "next/link";
import config from "@/config";

export default function ButtonSignIn() {
  return (
    <Link href={config.auth.loginUrl} className="btn btn-ghost btn-sm">
      Sign In
    </Link>
  );
}
