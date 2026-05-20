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
        title="Sincronizar datos financieros"
        className={`text-xs border px-3 py-1.5 rounded-full font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
          dark
            ? "text-slate-400 bg-slate-900 border-slate-800 hover:border-slate-700"
            : "text-slate-700 bg-slate-100 border-slate-200 hover:border-slate-300"
        }`}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
        />
        <span>
          {loading
            ? "Sincronizando…"
            : lastSyncedAt
            ? `${formatSyncTime(lastSyncedAt)}`
            : "Datos listos"}
        </span>

        {/* Connection dot */}
        <span className="relative flex items-center">
          <span
            className={`w-2 h-2 rounded-full ${cfg.bg} shrink-0`}
          />
          {connectionState === "connected" && (
            <span
              className={`absolute w-2 h-2 rounded-full ${cfg.bg} animate-ping`}
            />
          )}
        </span>
      </button>

      {/* Hover popover */}
      <div
        className={`absolute right-0 top-full mt-2 w-64 rounded-2xl z-50 border transition-all duration-200 origin-top-right ${
          hovered
            ? "opacity-100 visible scale-100 translate-y-0"
            : "opacity-0 invisible scale-95 -translate-y-1 pointer-events-none"
        } ${
          dark
            ? "bg-slate-950 border-slate-800 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]"
            : "bg-white border-slate-200 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)]"
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b ${
            dark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-indigo-500" />
            <span
              className={`text-xs font-black ${
                dark ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Estado de conexión
            </span>
          </div>
        </div>

        <div className="p-3 space-y-3">
          {/* Connection state */}
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                dark ? "bg-slate-900" : "bg-slate-50"
              }`}
            >
              <ConnIcon
                className={`w-4 h-4 ${cfg.color} ${
                  isConnecting ? "animate-spin" : ""
                }`}
              />
            </div>
            <div>
              <p
                className={`text-[11px] font-black ${
                  dark ? "text-slate-200" : "text-slate-800"
                }`}
              >
                WebSocket: {cfg.label}
              </p>
              <p className="text-[10px] text-slate-500">
                {connectionState === "connected"
                  ? "Sincronización en tiempo real activa"
                  : connectionState === "connecting"
                  ? "Estableciendo conexión..."
                  : "Sin sincronización en tiempo real"}
              </p>
            </div>
          </div>

          {/* Sessions */}
          {sessionCount > 0 && (
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  dark ? "bg-slate-900" : "bg-slate-50"
                }`}
              >
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p
                  className={`text-[11px] font-black ${
                    dark ? "text-slate-200" : "text-slate-800"
                  }`}
                >
                  {sessionCount} sesión{sessionCount !== 1 ? "es" : ""} activa
                  {sessionCount !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-slate-500">
                  {sessionCount > 1
                    ? "Cambios se sincronizan entre pestañas"
                    : "Solo esta pestaña está conectada"}
                </p>
              </div>
            </div>
          )}

          {/* Last sync */}
          {lastSyncedAt && (
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold ${
                dark
                  ? "bg-slate-900 text-slate-400"
                  : "bg-slate-50 text-slate-500"
              }`}
            >
              <span>Última sincronización</span>
              <span
                className={`font-black ${
                  dark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {formatSyncTime(lastSyncedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
