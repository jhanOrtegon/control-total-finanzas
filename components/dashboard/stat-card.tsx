"use client";

import React from "react";
import { useTheme } from "@/providers/theme-provider";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
  actionButton?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  unit = "COP",
  icon,
  footer,
  variant = "default",
  actionButton,
}: StatCardProps) {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return theme === "dark"
          ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-300"
          : "bg-emerald-50 border-emerald-200 text-emerald-800";
      case "danger":
        return theme === "dark"
          ? "bg-rose-950/20 border-rose-900/60 text-rose-300"
          : "bg-rose-50 border-rose-200 text-rose-800";
      case "warning":
        return theme === "dark"
          ? "bg-amber-950/20 border-amber-900/60 text-amber-300"
          : "bg-amber-50 border-amber-200 text-amber-800";
      default:
        return theme === "dark"
          ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-100"
          : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-900";
    }
  };

  return (
    <div className={`border rounded-3xl p-6 relative overflow-hidden transition shadow-xl group ${getVariantStyles()}`}>
      {variant === "default" && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/[0.02] rounded-full blur-2xl group-hover:bg-slate-500/5 transition"></div>
      )}
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</span>
        {actionButton ? actionButton : icon && <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/10 text-slate-500">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight">
          {value}
        </span>
        {unit && <span className="text-[9px] text-slate-400 font-bold uppercase">{unit}</span>}
      </div>

      {footer && (
        <div className="text-[11px] text-slate-500 mt-3 font-semibold">
          {footer}
        </div>
      )}
    </div>
  );
}
