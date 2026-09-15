"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  Lock,
  Radar,
  Settings,
  Sparkles,
} from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { cn } from "@/lib/utils";
import { LockScreen } from "./LockScreen";

const NAV = [
  { href: "/", label: "Plošča", icon: LayoutDashboard },
  { href: "/devices", label: "Naprave", icon: Lightbulb },
  { href: "/discover", label: "Odkrivanje", icon: Radar },
  { href: "/scenes", label: "Prizori", icon: Sparkles },
  { href: "/settings", label: "Nastavitve", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, unlocked, state, lock } = useHome();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sand-100/70">
        Pripravljam dom ...
      </div>
    );
  }

  if (!unlocked) return <LockScreen />;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-white/5 bg-ink-900/80 p-6 lg:flex lg:flex-col">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.24em] text-sand-400">SmartHome</p>
          <h1 className="mt-2 text-2xl font-medium">{state.settings.homeName}</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-sand-100/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {state.settings.pinHash ? (
          <button
            type="button"
            onClick={lock}
            className="mt-6 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-sand-100/60 hover:bg-white/5"
          >
            <Lock size={16} />
            Zakleni
          </button>
        ) : null}
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-sand-400">SmartHome</p>
            <p className="text-sm font-medium">{state.settings.homeName}</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
        <nav className="sticky bottom-0 grid grid-cols-5 border-t border-white/5 bg-ink-950/90 px-1 py-2 backdrop-blur lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px]",
                  active ? "text-glow-400" : "text-sand-100/55",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
