"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import {
  analyzePoolBalance,
  buildEnvelopeRows,
  computeEnvelopeTotals,
  getSpendablePool,
} from "@/lib/envelope-calculations";
import { spentByCategoryInMonth } from "@/lib/financial-events";
import { formatCurrency } from "@/lib/utils";

interface PoolBalanceBannerProps {
  dismissible?: boolean;
}

export function PoolBalanceBanner({ dismissible }: PoolBalanceBannerProps) {
  const { budget, categoryBudgets, expenses, getMonthlySummary } = useFinance();
  const { month, year, linkWithPeriod } = useFinancePeriod();
  const [hidden, setHidden] = React.useState(false);

  const analysis = useMemo(() => {
    const summary = getMonthlySummary(month, year);
    const income = budget?.monthly_income ?? summary.baseIncome;
    const pool = getSpendablePool(
      income,
      budget?.monthly_budget ?? 0,
      budget?.monthly_savings_goal ?? summary.savingsGoal,
    );
    const spent = spentByCategoryInMonth(expenses, month, year);
    const rows = buildEnvelopeRows(categoryBudgets, spent);
    const totals = computeEnvelopeTotals(rows, pool);
    return analyzePoolBalance(pool, totals.totalLimits, totals.totalSpent);
  }, [budget, categoryBudgets, expenses, getMonthlySummary, month, year]);

  if (hidden || analysis.status === "no_pool" || analysis.status === "balanced") {
    return null;
  }

  const Icon =
    analysis.severity === "critical"
      ? AlertTriangle
      : analysis.severity === "warning"
        ? Info
        : CheckCircle2;

  const styles =
    analysis.severity === "critical"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";

  return (
    <div className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${styles}`}>
      <div className="flex items-start gap-2 flex-1">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs font-semibold space-y-1">
          <p className="font-black uppercase tracking-wide text-[10px] opacity-80">
            Enlace presupuesto global ↔ sobres
          </p>
          <p>{analysis.message}</p>
          <p className="text-[10px] opacity-90">
            Pool: {formatCurrency(analysis.spendablePool)} · Sobres:{" "}
            {formatCurrency(analysis.totalLimits)}
            {analysis.difference !== 0 && (
              <> · Diferencia: {formatCurrency(Math.abs(analysis.difference))}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Link
          href={linkWithPeriod("/budgets")}
          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black"
        >
          Ajustar sobres
        </Link>
        <Link
          href="/settings"
          className="px-3 py-1.5 rounded-lg border border-current text-[10px] font-black opacity-90"
        >
          Presupuesto global
        </Link>
        {dismissible && (
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="px-2 py-1.5 text-[10px] font-bold opacity-70 cursor-pointer"
          >
            Ocultar
          </button>
        )}
      </div>
    </div>
  );
}
