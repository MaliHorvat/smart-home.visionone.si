"use client";

import { useHome } from "@/context/HomeContext";

export function Toast() {
  const { notice } = useHome();
  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
      <p className="rounded-full border border-white/10 bg-ink-700/95 px-4 py-2 text-sm shadow-panel">
        {notice}
      </p>
    </div>
  );
}
