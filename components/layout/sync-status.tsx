"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  Users,
  Signal,
} from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";

function formatSyncTime(date: Date) {
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const connectionConfig = {
  connected: {
    icon: Wifi,
    color: "text-emerald-500",
    bg: "bg-emerald-500",
    ringLight: "ring-emerald-200",
    ringDark: "ring-emerald-900",
    label: "En vivo",
  },
  connecting: {
    icon: Loader2,
    color: "text-amber-500",
    bg: "bg-amber-500",
    ringLight: "ring-amber-200",
    ringDark: "ring-amber-900",
    label: "Conectando",
  },
  disconnected: {
    icon: WifiOff,
    color: "text-slate-400",
    bg: "bg-slate-400",
    ringLight: "ring-slate-200",
    ringDark: "ring-slate-700",
    label: "Sin conexión",
  },
} as const;

export function SyncStatus() {
  const { lastSyncedAt, loading, refetchAll, connectionState, sessionCount } =
    useFinance();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [hovered, setHovered] = useState(false);

  const cfg = connectionConfig[connectionState];
  const ConnIcon = cfg.icon;
  const isConnecting = connectionState === "connecting";

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main button */}
      <button
        type="button"
        onClick={() => refetchAll()}
        disabled={loading}
        className={`text-xs border px-3 py-1.5 rounded-full font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
          dark
            ? "text-slate-400 bg-slate-900 border-slate-800 hover:border-slate-700"
            : "text-slate-700 bg-slate-100 border-slate-200 hover:border-slate-300"
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        <span>
          {loading
            ? "Sincronizando…"
            : lastSyncedAt
              ? `${formatSyncTime(lastSyncedAt)}`
              : "Datos listos"}
        </span>

        {/* Connection dot */}
        <span className="relative flex items-center">
          <span className={`w-2 h-2 rounded-full ${cfg.bg} shrink-0`} />
          {connectionState === "connected" && (
            <span
              className={`absolute w-2 h-2 rounded-full ${cfg.bg} animate-ping`}
            />
          )}
        </span>
      </button>

      {/* Hover popover */}
    </div>
  );
}
