"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertOctagon,
  AlertTriangle,
  Info,
  CalendarClock,
} from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import {
  buildSmartAlerts,
  countAlertsBySeverity,
  type AlertSeverity,
  type FinanceAlert,
} from "@/lib/alerts-engine";

const FILTERS: { id: "all" | AlertSeverity; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "critical", label: "Críticas" },
  { id: "warning", label: "Avisos" },
  { id: "info", label: "Info" },
];

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  if (severity === "critical") return <AlertOctagon className="w-4 h-4 text-rose-500" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <Info className="w-4 h-4 text-indigo-500" />;
}

function AlertRow({ alert }: { alert: FinanceAlert }) {
  const { theme } = useTheme();
  const border =
    alert.severity === "critical"
      ? "border-rose-500/25 bg-rose-500/5"
      : alert.severity === "warning"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-indigo-500/20 bg-indigo-500/5";

  const content = (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border text-xs ${border} ${
        theme === "dark" ? "" : ""
      }`}
    >
      <SeverityIcon severity={alert.severity} />
      <div className="flex-1 min-w-0">
        <p className="font-black">{alert.title}</p>
        <p className="text-slate-500 font-semibold mt-0.5 leading-relaxed">
          {alert.message}
        </p>
        {alert.dueDate && (
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {alert.dueDate.toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        )}
      </div>
      {alert.amount != null && alert.amount > 0 && (
        <span className="font-black text-rose-500 shrink-0">
          {formatCurrency(alert.amount)}
        </span>
      )}
    </div>
  );

  if (alert.href) {
    return (
      <Link href={alert.href} className="block hover:opacity-90 transition">
        {content}
      </Link>
    );
  }
  return content;
}

interface AlertCenterProps {
  month?: number;
  year?: number;
  compact?: boolean;
  kindFilter?: FinanceAlert["kind"] | FinanceAlert["kind"][];
  title?: string;
}

export function AlertCenter({
  month,
  year,
  compact,
  kindFilter,
  title = "Centro de alertas",
}: AlertCenterProps) {
  const { theme } = useTheme();
  const {
    expenses,
    debts,
    budget,
    categoryBudgets,
    getMonthlySummary,
  } = useFinance();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const [filter, setFilter] = useState<"all" | AlertSeverity>("all");

  const summary = getMonthlySummary(m, y);
  const allAlerts = useMemo(() => {
    const base = buildSmartAlerts(
      expenses,
      debts,
      budget,
      summary,
      categoryBudgets,
      m,
      y,
    );
    if (!kindFilter) return base;
    const kinds = Array.isArray(kindFilter) ? kindFilter : [kindFilter];
    return base.filter((a) => kinds.includes(a.kind));
  }, [expenses, debts, budget, summary, categoryBudgets, m, y, kindFilter]);

  const counts = countAlertsBySeverity(allAlerts);
  const filtered =
    filter === "all"
      ? allAlerts
      : allAlerts.filter((a) => a.severity === filter);

  const display = compact ? filtered.slice(0, 5) : filtered;

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            {title}
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {counts.critical > 0 && (
              <span className="text-rose-500 font-bold">{counts.critical} crítica(s) · </span>
            )}
            {counts.warning} aviso(s) · {counts.info} informativa(s)
          </p>
        </div>
        {!compact && (
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                  filter === f.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {display.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs font-bold text-emerald-500">
            Sin alertas activas para este filtro.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {display.map((a) => (
            <li key={a.id}>
              <AlertRow alert={a} />
            </li>
          ))}
        </ul>
      )}

      {compact && allAlerts.length > 5 && (
        <Link
          href="/alerts"
          className="block text-center text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Ver las {allAlerts.length} alertas →
        </Link>
      )}
    </section>
  );
}
