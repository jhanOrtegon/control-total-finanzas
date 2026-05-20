"use client";

import React from "react";
import { useTheme } from "@/providers/theme-provider";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  actionButton?: React.ReactNode;
  /** Show a mini progress bar (0-100) */
  progressPct?: number;
  /** Subtle accent line color at the top */
  accentColor?: "emerald" | "rose" | "amber" | "indigo" | "violet";
}

const ACCENT_BARS: Record<string, string> = {
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  indigo: "bg-slate-700 dark:bg-slate-400",
  violet: "bg-slate-700 dark:bg-slate-400",
};

const VARIANT_PROGRESS_COLOR: Record<string, string> = {
  success: "bg-emerald-500",
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  default: "bg-slate-700 dark:bg-slate-400",
  info: "bg-slate-500",
};

export function StatCard({
  title,
  value,
  unit = "COP",
  icon,
  footer,
  variant = "default",
  actionButton,
  progressPct,
  accentColor,
}: StatCardProps) {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return theme === "dark"
          ? "bg-slate-900 border-slate-800 text-slate-100 shadow-sm"
          : "bg-white border-slate-200 text-slate-900 shadow-sm";
      case "danger":
        return theme === "dark"
          ? "bg-rose-950/20 border-rose-900/50 text-slate-100 shadow-sm"
          : "bg-rose-50/50 border-rose-200 text-slate-900 shadow-sm";
      case "warning":
        return theme === "dark"
          ? "bg-amber-950/20 border-amber-900/50 text-slate-100 shadow-sm"
          : "bg-amber-50/50 border-amber-200 text-slate-900 shadow-sm";
      case "info":
        return theme === "dark"
          ? "bg-slate-900 border-slate-800 text-slate-100 shadow-sm"
          : "bg-white border-slate-200 text-slate-900 shadow-sm";
      default:
        return theme === "dark"
          ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100 shadow-sm"
          : "bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-sm";
    }
  };

  const resolvedAccent = accentColor ?? (
    variant === "success" ? "emerald"
    : variant === "danger" ? "rose"
    : variant === "warning" ? "amber"
    : variant === "info" ? "indigo"
    : "indigo"
  );

  return (
    <div
      className={`border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 shadow-elegant-hover hover:-translate-y-0.5 group ${getVariantStyles()}`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-6 right-6 h-0.5 rounded-b-full opacity-70 ${ACCENT_BARS[resolvedAccent]}`} />

      {/* Decorative glow blob */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04] blur-2xl bg-white group-hover:opacity-[0.07] transition-opacity pointer-events-none" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{title}</span>
        {actionButton
          ? actionButton
          : icon && (
              <div className="p-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                {icon}
              </div>
            )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest">
            {unit}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progressPct !== undefined && (
        <div className="mt-4 space-y-1">
          <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${VARIANT_PROGRESS_COLOR[variant]}`}
              style={{ width: `${Math.min(Math.max(progressPct, 0), 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-bold opacity-50">{progressPct.toFixed(0)}%</p>
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="text-[11px] opacity-70 mt-3 font-semibold">
          {footer}
        </div>
      )}
    </div>
  );
}
