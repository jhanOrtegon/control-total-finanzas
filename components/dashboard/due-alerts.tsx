"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertOctagon, AlertTriangle, CalendarClock } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { buildDueAlerts } from "@/lib/alerts-engine";

export function DueAlerts() {
  const { expenses, debts } = useFinance();
  const { theme } = useTheme();

  const { overdue, upcoming } = useMemo(() => {
    const all = buildDueAlerts(expenses, debts, 7);
    return {
      overdue: all.filter((a) => a.kind === "due_overdue"),
      upcoming: all.filter((a) => a.kind !== "due_overdue"),
    };
  }, [expenses, debts]);

  if (overdue.length === 0 && upcoming.length === 0) return null;

  return (
    <section
      className={`border rounded-3xl p-5 space-y-4 ${
        theme === "dark"
          ? overdue.length > 0
            ? "bg-rose-950/25 border-rose-900/50"
            : "bg-amber-950/20 border-amber-900/40"
          : overdue.length > 0
            ? "bg-rose-50 border-rose-200"
            : "bg-amber-50 border-amber-200"
      }`}
    >
      {overdue.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertOctagon className="w-4 h-4" />
            Vencidos ({overdue.length})
          </h3>
          <ul className="space-y-2">
            {overdue.map((a) => (
              <li
                key={a.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl text-xs border ${
                  theme === "dark"
                    ? "bg-slate-950/50 border-rose-900/40"
                    : "bg-white border-rose-100"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{a.title}</p>
                  <p className="text-[10px] text-rose-500 font-bold">{a.message}</p>
                </div>
                {a.amount != null && (
                  <span className="font-black text-rose-500 shrink-0">
                    {formatCurrency(a.amount)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            Próximos 7 días ({upcoming.length})
          </h3>
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl text-xs border ${
                  theme === "dark"
                    ? "bg-slate-950/50 border-slate-800"
                    : "bg-white border-amber-100"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarClock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold truncate">{a.title}</p>
                    <p className="text-[10px] text-slate-500">{a.message}</p>
                  </div>
                </div>
                {a.amount != null && (
                  <span className="font-black text-rose-500 shrink-0">
                    {formatCurrency(a.amount)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Cronograma →
        </Link>
        <Link
          href="/alerts"
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Todas las alertas →
        </Link>
      </div>
    </section>
  );
}
