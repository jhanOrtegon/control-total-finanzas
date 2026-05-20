"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Gauge, TrendingUp } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";

interface BudgetPaceCardProps {
  month?: number;
  year?: number;
}

export function BudgetPaceCard({ month, year }: BudgetPaceCardProps) {
  const { theme } = useTheme();
  const { budget, getMonthlySummary } = useFinance();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const isCurrent =
    m === now.getMonth() + 1 && y === now.getFullYear();

  const stats = useMemo(() => {
    const summary = getMonthlySummary(m, y);
    const limit = budget?.monthly_budget ?? 0;
    const spent = summary.monthSpent;
    const ref = isCurrent ? now : new Date(y, m, 0);
    const day = isCurrent ? now.getDate() : ref.getDate();
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysLeft = daysInMonth - day;
    const pctUsed = limit > 0 ? (spent / limit) * 100 : 0;
    const dailyAvg = day > 0 ? spent / day : 0;
    const projected = dailyAvg * daysInMonth;
    const remaining = limit - spent;
    const daysUntilEmpty =
      dailyAvg > 0 && remaining > 0 ? Math.floor(remaining / dailyAvg) : null;

    return {
      limit,
      spent,
      daysLeft,
      daysInMonth,
      pctUsed,
      projected,
      daysUntilEmpty,
      overBudget: limit > 0 && spent > limit,
    };
  }, [budget, getMonthlySummary, m, y, isCurrent, now]);

  if (stats.limit <= 0) {
    return (
      <section
        className={`border rounded-3xl p-5 ${
          theme === "dark"
            ? "bg-slate-900/40 border-slate-800"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <p className="text-xs font-bold text-slate-500">
          Configura un presupuesto mensual en{" "}
          <Link href="/settings" className="text-indigo-600 underline">
            Ajustes
          </Link>{" "}
          para ver el ritmo de gasto.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <h3 className="text-base font-black flex items-center gap-2">
        <Gauge className="w-5 h-5 text-indigo-500" />
        Ritmo del presupuesto
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-500">Usado del tope</span>
          <span className={stats.overBudget ? "text-rose-500" : ""}>
            {stats.pctUsed.toFixed(0)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              stats.pctUsed > 100
                ? "bg-rose-500"
                : stats.pctUsed > 80
                  ? "bg-amber-500"
                  : "bg-indigo-500"
            }`}
            style={{ width: `${Math.min(100, stats.pctUsed)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-slate-500">
          <span>{formatCurrency(stats.spent)} gastado</span>
          <span>{formatCurrency(stats.limit)} tope</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">
            Proyección fin de mes
          </span>
          <span className="font-black flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            {formatCurrency(stats.projected)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">
            Días restantes
          </span>
          <span className="font-black mt-1">{stats.daysLeft} días</span>
          {stats.daysUntilEmpty != null && stats.daysUntilEmpty <= stats.daysLeft && (
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
              Presupuesto ~{stats.daysUntilEmpty}d si sigues igual
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
