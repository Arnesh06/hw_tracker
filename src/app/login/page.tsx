import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,520px)]">
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <TraceArt />
        <Logo className="relative text-white" />
        <div className="relative max-w-md">
          <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-white">
            Every board, sensor and scope, accounted for.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-sidebar-muted">
            Register hardware once, then follow who owns it, who holds it and where it went. Every change is recorded.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-muted">Access is managed by your administrator.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the email and password your administrator gave you.</p>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}

/** Circuit-trace illustration for the sign-in panel. */
function TraceArt() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]" aria-hidden preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 800">
      <g fill="none" stroke="hsl(163 55% 48%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-10 120 H140 L190 170 H360 L400 130 H620" />
        <path d="M-10 260 H80 L120 300 H300 L340 340 V460 L380 500 H620" />
        <path d="M60 820 V620 L100 580 H220 L260 540 V380" />
        <path d="M480 820 V700 L440 660 V560 L470 530 H620" />
        <path d="M200 -10 V60 L240 100 H330" />
        <path d="M-10 420 H40 L80 460 V640" />
      </g>
      <g fill="hsl(163 55% 48%)">
        {[[190, 170], [360, 170], [300, 300], [340, 460], [260, 380], [220, 580], [440, 560], [330, 100], [80, 640], [140, 120]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="6" />
        ))}
      </g>
      <rect x="360" y="230" width="140" height="140" rx="8" fill="none" stroke="hsl(163 55% 48%)" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} stroke="hsl(163 55% 48%)" strokeWidth="2">
          <line x1={378 + i * 26} y1="215" x2={378 + i * 26} y2="230" />
          <line x1={378 + i * 26} y1="370" x2={378 + i * 26} y2="385" />
        </g>
      ))}
    </svg>
  );
}
