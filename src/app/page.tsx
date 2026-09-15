"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { AddWidgetModal } from "@/components/AddWidgetModal";
import { WidgetCard } from "@/components/WidgetCard";
import { useHome } from "@/context/HomeContext";

export default function DashboardPage() {
  const { state, error } = useHome();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-sand-400">Nadzorna plošča</p>
          <h1 className="mt-2 text-4xl">{state.settings.homeName}</h1>
          <p className="mt-2 max-w-2xl text-sand-100/65">
            Sestavi si svojo ploščo: vklopi luči, zaženi prizore in spremljaj prostore.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3"
          >
            <Pencil size={16} />
            {editing ? "Končaj" : "Uredi"}
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-2xl bg-glow-500 px-4 py-3 font-medium text-ink-950"
          >
            <Plus size={16} />
            Ploščica
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section className="grid-dashboard mt-8">
        {state.widgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} editing={editing} />
        ))}
      </section>

      {adding ? <AddWidgetModal onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
