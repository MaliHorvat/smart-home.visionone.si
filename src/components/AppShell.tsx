"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  Menu,
  Radar,
  Settings,
  Sparkles,
} from "lucide-react";
import { useHome } from "@/context/HomeContext";
import { cn } from "@/lib/utils";
import { LockScreen } from "./LockScreen";
import { Toast } from "./Toast";

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (pathname === "/login") return <>{children}</>;

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-ha-muted">
        Pripravljam dom ...
      </div>
    );
  }

  if (!unlocked) return <LockScreen />;

  return (
    <div className="min-h-screen bg-ha-bg lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-ha-line bg-white p-6 lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ha-primary text-sm font-medium text-white">
            HA
          </span>
          <div>
            <p className="text-xs text-ha-muted">SmartHome</p>
            <h1 className="text-lg font-medium">{state.settings.homeName}</h1>
          </div>
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
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                  active ? "bg-sky-50 text-ha-primary" : "text-ha-muted hover:bg-ha-bg hover:text-ha-text",
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
            className="mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-ha-muted hover:bg-ha-bg"
          >
            <Lock size={16} />
            Zakleni PIN
          </button>
        ) : null}
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-ha-muted hover:bg-ha-bg"
        >
          <LogOut size={16} />
          Odjava
        </button>
      </aside>

      <div className="flex min-h-screen flex-col">
        {pathname === "/" ? null : (
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ha-line bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <Menu size={20} className="text-ha-muted" />
              <p className="text-base font-medium">{state.settings.homeName}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-xl px-3 py-2 text-xs text-ha-muted">
              Odjava
            </button>
          </header>
        )}
        <main
          className={cn(
            "flex-1",
            pathname === "/" ? "px-3 py-3 sm:px-6" : "px-4 py-6 sm:px-8",
          )}
        >
          {children}
        </main>
        <Toast />
        <nav className="sticky bottom-0 grid grid-cols-5 border-t border-ha-line bg-white px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px]",
                  active ? "text-ha-primary" : "text-ha-muted",
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
