import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import config from "@/config";
import content from "@/content";
import StatusBadge from "@/components/leaseguard/StatusBadge";
import VerdictBadge from "@/components/leaseguard/VerdictBadge";

export default async function Hero() {
  const session = await auth();

  return (
    <section id="hero" className="mx-auto grid max-w-[1100px] items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
      <div className="space-y-7">
        <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {content.appTagline}.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-base-content/75">
          What is your GPU doing right now, and what happens if you walk away? {content.appName} watches your JarvisLabs
          runs and asks you on Telegram before it checkpoints and pauses anything that has gone quiet.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {session?.user ? (
            <Link href="/dashboard" className="btn btn-primary gap-2">
              Open dashboard
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <Link href={config.auth.loginUrl} className="btn btn-primary gap-2">
              Sign in to get started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
          <Link href="#how-it-works" className="btn btn-ghost">
            How it works
          </Link>
        </div>
      </div>

      <figure className="panel space-y-4 p-5" aria-label="Example of a guard verdict (illustration)">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="num truncate font-medium">sdxl-dreambooth-v3</p>
            <p className="num text-xs text-base-content/70">1× RTX 6000 Ada</p>
          </div>
          <StatusBadge status="suspicious" />
        </div>
        <dl className="num grid grid-cols-3 gap-3 rounded-lg bg-base-100 p-3 text-xs ring-1 ring-base-content/[0.06] ring-inset">
          <div>
            <dt className="text-base-content/70">GPU util</dt>
            <dd className="mt-1 text-lg text-primary">3%</dd>
          </div>
          <div>
            <dt className="text-base-content/70">Idle for</dt>
            <dd className="mt-1 text-lg">25 min</dd>
          </div>
          <div>
            <dt className="text-base-content/70">VRAM held</dt>
            <dd className="mt-1 text-lg">22.4 GB</dd>
          </div>
        </dl>
        <pre className="num overflow-hidden rounded-lg bg-base-100 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-base-content/80 ring-1 ring-base-content/[0.06] ring-inset">
          {"step 1600/2000 | loss 0.0912\n[W dataloader] worker 3 timed out after 600s"}
        </pre>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge kind="suspicious" />
          <span className="text-sm text-base-content/75">Telegram reminder sent · auto-pause in 15 min</span>
        </div>
        <figcaption className="text-xs text-base-content/70">Example only — sample data, not a live run.</figcaption>
      </figure>
    </section>
  );
}
