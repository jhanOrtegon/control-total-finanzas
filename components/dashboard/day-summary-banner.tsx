"use client";

import React, { useMemo } from "react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { formatCurrency } from "@/lib/utils";
import { buildDueAlerts } from "@/lib/alerts-engine";
import { TrendingDown, TrendingUp, AlertTriangle, Smile, Sun, Moon, Sunset } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Buenos días", Icon: Sun };
  if (hour >= 12 && hour < 18) return { text: "Buenas tardes", Icon: Sunset };
  return { text: "Buenas noches", Icon: Moon };
}

function getFormattedDate() {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DaySummaryBanner() {
  const { getMonthlySummary, expenses, debts } = useFinance();
  const { month, year } = useFinancePeriod();

  const summary = useMemo(
    () => getMonthlySummary(month, year),
    [getMonthlySummary, month, year]
  );

  const alerts = useMemo(
    () => buildDueAlerts(expenses, debts, 7),
    [expenses, debts]
  );
  const overdueCount = alerts.filter((a) => a.kind === "due_overdue").length;
  const upcomingCount = alerts.filter((a) => a.kind !== "due_overdue").length;

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const formattedDate = getFormattedDate();

  const isPositive = summary.realAvailableCash >= 0;
  const spent = summary.monthSpent;
  const available = summary.realAvailableCash;
  const income = summary.totalIncome;

  const spentPct = income > 0 ? Math.min((spent / income) * 100, 100) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-6 transition-all
        ${
          isPositive
            ? "bg-slate-900 dark:bg-slate-800 border-slate-800 dark:border-slate-700 text-slate-100 shadow-sm"
            : "bg-rose-950 dark:bg-rose-950 border-rose-900/50 text-rose-100 shadow-sm"
        }`}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-black/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Left: Greeting + date */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GreetingIcon className="w-5 h-5 text-white/70" />
            <p className="text-sm font-semibold text-white/80">{greetingText}</p>
          </div>
          <p className="text-xs text-white/50 capitalize">{formattedDate}</p>

          {/* Alerts summary */}
          <div className="flex flex-wrap gap-2 mt-3">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/30 border border-rose-400/40 text-rose-100">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} vencido{overdueCount > 1 ? "s" : ""}
              </span>
            )}
            {upcomingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/30 border border-amber-400/40 text-amber-100">
                <AlertTriangle className="w-3 h-3" />
                {upcomingCount} próximo{upcomingCount > 1 ? "s" : ""}
              </span>
            )}
            {overdueCount === 0 && upcomingCount === 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/30 border border-emerald-400/40 text-emerald-100">
                <Smile className="w-3 h-3" />
                Sin alertas urgentes
              </span>
            )}
          </div>
        </div>

        {/* Right: Key numbers */}
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {/* Spent */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Gastado</p>
            </div>
            <p className="text-xl font-black tabular-nums">{formatCurrency(spent)}</p>
            {/* Mini progress bar */}
            <div className="mt-1.5 w-full h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/60 transition-all duration-700"
                style={{ width: `${spentPct}%` }}
              />
            </div>
            <p className="text-[9px] text-white/50 mt-0.5 font-semibold">{spentPct.toFixed(0)}% del ingreso</p>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/20 hidden sm:block self-stretch" />

          {/* Available */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-white/60" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Disponible</p>
            </div>
            <p className={`text-xl font-black tabular-nums ${isPositive ? "text-white" : "text-rose-200"}`}>
              {isPositive ? "" : "-"}{formatCurrency(Math.abs(available))}
            </p>
            <p className="text-[9px] text-white/50 mt-2 font-semibold">
              {isPositive ? "Flujo positivo ✓" : "Déficit ⚠️"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
