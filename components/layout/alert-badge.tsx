"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import {
  buildSmartAlerts,
  countAlertsBySeverity,
  type FinanceAlert,
} from "@/lib/alerts-engine";
import { formatCurrency } from "@/lib/utils";

function SeverityIcon({ severity }: { severity: FinanceAlert["severity"] }) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    case "warning":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    default:
      return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }
}

function severityBg(severity: FinanceAlert["severity"], dark: boolean) {
  if (severity === "critical")
    return dark
      ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10"
      : "bg-rose-50/80 border-rose-100 hover:bg-rose-50";
  if (severity === "warning")
    return dark
      ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
      : "bg-amber-50/80 border-amber-100 hover:bg-amber-50";
  return dark
    ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
    : "bg-blue-50/80 border-blue-100 hover:bg-blue-50";
}

function severityLabel(severity: FinanceAlert["severity"]) {
  if (severity === "critical") return "Crítica";
  if (severity === "warning") return "Atención";
  return "Info";
}

export function AlertBadge() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const {
    expenses,
    debts,
    budget,
    categoryBudgets,
    getMonthlySummary,
  } = useFinance();
  const { month, year, linkWithPeriod } = useFinancePeriod();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const alerts = useMemo(() => {
    const summary = getMonthlySummary(month, year);
    return buildSmartAlerts(
      expenses,
      debts,
      budget,
      summary,
      categoryBudgets,
      month,
      year,
    );
  }, [expenses, debts, budget, categoryBudgets, getMonthlySummary, month, year]);

  const counts = useMemo(() => countAlertsBySeverity(alerts), [alerts]);

  if (counts.total === 0) return null;

  const displayed = alerts.slice(0, 6);
  const remaining = alerts.length - displayed.length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
          counts.critical > 0
            ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
        }`}
      >
        <Bell className={`w-3.5 h-3.5 ${open ? "animate-[wiggle_0.3s_ease-in-out]" : ""}`} />
        <span>{counts.total}</span>
        {counts.critical > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-white dark:ring-slate-950" />
        )}
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 top-full mt-3 w-96 rounded-2xl z-50 flex flex-col border transition-all duration-300 origin-top-right ${
          open
            ? "opacity-100 visible scale-100 translate-y-0"
            : "opacity-0 invisible scale-95 -translate-y-2 pointer-events-none"
        } ${
          dark
            ? "bg-slate-950 border-slate-800/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
            : "bg-white border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]"
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 flex items-center justify-between border-b ${
            dark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                dark ? "bg-indigo-500/15" : "bg-indigo-50"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div>
              <h3
                className={`text-xs font-black ${
                  dark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                Notificaciones
              </h3>
              <p className="text-[9px] text-slate-500 font-semibold">
                {counts.total} alerta{counts.total !== 1 ? "s" : ""} activa
                {counts.total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Severity summary pills */}
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                {counts.critical} crítica{counts.critical !== 1 ? "s" : ""}
              </span>
            )}
            {counts.warning > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                {counts.warning}
              </span>
            )}
          </div>
        </div>

        {/* Alert list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
          {displayed.map((alert, i) => (
            <Link
              key={alert.id || i}
              href={alert.href || linkWithPeriod("/alerts")}
              onClick={() => setOpen(false)}
              className={`group/item flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${severityBg(
                alert.severity,
                dark,
              )}`}
            >
              {/* Icon */}
              <div className="mt-0.5">
                <SeverityIcon severity={alert.severity} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider ${
                      alert.severity === "critical"
                        ? "text-rose-500"
                        : alert.severity === "warning"
                        ? "text-amber-500"
                        : "text-blue-500"
                    }`}
                  >
                    {severityLabel(alert.severity)}
                  </span>
                </div>
                <p
                  className={`text-[11px] font-bold leading-tight mb-0.5 ${
                    dark ? "text-slate-200" : "text-slate-800"
                  }`}
                >
                  {alert.title}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                  {alert.message}
                </p>
                {alert.amount != null && alert.amount > 0 && (
                  <span
                    className={`inline-block mt-1 text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                      dark
                        ? "bg-slate-800 text-slate-300"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {formatCurrency(alert.amount)}
                  </span>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 mt-1 transition-transform duration-150 group-hover/item:translate-x-0.5 ${
                  dark ? "text-slate-600" : "text-slate-300"
                }`}
              />
            </Link>
          ))}

          {remaining > 0 && (
            <div
              className={`text-center py-2 text-[10px] font-bold ${
                dark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              +{remaining} alerta{remaining !== 1 ? "s" : ""} más
            </div>
          )}
        </div>

        {/* Footer */}
        <Link
          href={linkWithPeriod("/alerts")}
          onClick={() => setOpen(false)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 border-t text-[11px] font-black transition-colors ${
            dark
              ? "border-slate-800/80 text-indigo-400 hover:bg-indigo-500/10"
              : "border-slate-100 text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          Ver todas las alertas
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
