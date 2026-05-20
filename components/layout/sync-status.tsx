"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";

function formatSyncTime(date: Date) {
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SyncStatus() {
  const { lastSyncedAt, loading, refetchAll } = useFinance();
  const { theme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => refetchAll()}
        disabled={loading}
        title="Sincronizar datos financieros"
        className={`text-xs border px-3 py-1.5 rounded-full font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
          theme === "dark"
            ? "text-slate-400 bg-slate-900 border-slate-800 hover:border-slate-700"
            : "text-slate-700 bg-slate-100 border-slate-200 hover:border-slate-300"
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        <span>
          {loading
            ? "Sincronizando…"
            : lastSyncedAt
              ? `Sync ${formatSyncTime(lastSyncedAt)}`
              : "Datos listos"}
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      </button>
    </div>
  );
}
