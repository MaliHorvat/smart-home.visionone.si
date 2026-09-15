"use client";

import { useState } from "react";

export function CopyBlock({ label, value }: { label?: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3">
      {label ? <p className="mb-1 text-xs text-sand-100/50">{label}</p> : null}
      <button
        type="button"
        onClick={copy}
        className="w-full rounded-2xl border border-white/10 bg-ink-900 px-3 py-3 text-left text-xs leading-5 text-sand-100/80"
      >
        <span className="block whitespace-pre-wrap break-all font-mono">{value}</span>
        <span className="mt-2 block text-sand-400">{copied ? "Kopirano" : "Kopiraj"}</span>
      </button>
    </div>
  );
}
