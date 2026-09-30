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
      {label ? <p className="mb-1 text-xs text-ha-muted">{label}</p> : null}
      <button
        type="button"
        onClick={copy}
        className="w-full rounded-xl border border-ha-line bg-ha-bg px-3 py-3 text-left text-xs leading-5 text-ha-text"
      >
        <span className="block whitespace-pre-wrap break-all font-mono">{value}</span>
        <span className="mt-2 block text-ha-primary">{copied ? "Kopirano" : "Kopiraj"}</span>
      </button>
    </div>
  );
}
