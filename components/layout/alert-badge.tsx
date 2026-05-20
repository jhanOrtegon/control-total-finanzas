"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import { buildSmartAlerts, countAlertsBySeverity } from "@/lib/alerts-engine";

export function AlertBadge() {
  const { theme } = useTheme();
  const {
    expenses,
    debts,
    budget,
    categoryBudgets,
    getMonthlySummary,
  } = useFinance();
  const { month, year, linkWithPeriod } = useFinancePeriod();

  const counts = useMemo(() => {
    const summary = getMonthlySummary(month, year);
    const alerts = buildSmartAlerts(
      expenses,
      debts,
      budget,
      summary,
      categoryBudgets,
      month,
      year,
    );
    return countAlertsBySeverity(alerts);
  }, [expenses, debts, budget, categoryBudgets, getMonthlySummary, month, year]);

  if (counts.total === 0) return null;

  return (
    <Link
      href={linkWithPeriod("/alerts")}
      className={`relative flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-full font-bold transition ${
        counts.critical > 0
          ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      } ${theme === "dark" ? "" : ""}`}
      title="Ver alertas"
    >
      <Bell className="w-3.5 h-3.5" />
      <span>{counts.total}</span>
      {counts.critical > 0 && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      )}
    </Link>
  );
}
