"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Wallet, ArrowRight, AlertTriangle } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { spentByCategoryInMonth } from "@/lib/financial-events";
import {
  buildEnvelopeRows,
  computeEnvelopeTotals,
  getSpendablePool,
} from "@/lib/envelope-calculations";
import { formatCurrency } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/constants";

interface EnvelopeSummaryProps {
  compact?: boolean;
  month?: number;
  year?: number;
}

export function EnvelopeSummary({
  compact = false,
  month,
  year,
}: EnvelopeSummaryProps) {
  const { theme } = useTheme();
  const { categoryBudgets, expenses, budget, currentMonthSummary } = useFinance();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const spent = useMemo(
    () => spentByCategoryInMonth(expenses, m, y),
    [expenses, m, y],
  );

  const rows = useMemo(
    () => buildEnvelopeRows(categoryBudgets, spent),
    [categoryBudgets, spent],
  );

  const income = budget?.monthly_income ?? currentMonthSummary.baseIncome;
  const savingsGoal = budget?.monthly_savings_goal ?? 0;
  const monthlyBudget = budget?.monthly_budget ?? 0;
  const spendablePool = getSpendablePool(income, monthlyBudget, savingsGoal);

  const totals = useMemo(
    () => computeEnvelopeTotals(rows, spendablePool),
    [rows, spendablePool],
  );

  const configured = rows.filter((r) => !r.unconfigured);
  const topRisk = [...configured]
    .filter((r) => r.limit > 0)
    .sort((a, b) => b.pctUsed - a.pctUsed)
    .slice(0, compact ? 3 : 5);

  const noneConfigured = configured.length === 0;

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            Sobres del mes
          </h3>
          {!compact && (
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Topes por categoría vs gasto real ({m}/{y})
            </p>
          )}
        </div>
        <Link
          href="/budgets"
          className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 shrink-0"
        >
          Gestionar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {noneConfigured ? (
        <p className="text-xs text-slate-500 font-semibold">
          Aún no tienes sobres configurados. Define límites en{" "}
          <Link href="/budgets" className="text-indigo-600 font-bold">
            Presupuesto por categoría
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Asignado" value={formatCurrency(totals.totalLimits)} />
            <Stat label="Gastado" value={formatCurrency(totals.totalSpent)} />
            {!compact && (
              <Stat
                label="Sin asignar"
                value={formatCurrency(totals.unallocated)}
                muted={totals.unallocated <= 0}
              />
            )}
            <Stat
              label="Sobrepasados"
              value={String(totals.overBudgetCategories)}
              alert={totals.overBudgetCategories > 0}
            />
          </div>

          <ul className="space-y-2">
            {topRisk.map((row) => (
              <li
                key={row.category}
                className={`flex items-center gap-2 text-[10px] font-bold ${
                  row.over ? "text-rose-500" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>
                  {getCategoryEmoji(row.category)} {row.category}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.over ? "bg-rose-500" : "bg-indigo-500"}`}
                    style={{ width: `${Math.min(100, row.pctUsed)}%` }}
                  />
                </div>
                <span className="tabular-nums w-10 text-right">
                  {Math.round(row.pctUsed)}%
                </span>
                {row.over && <AlertTriangle className="w-3 h-3" />}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  alert,
  muted,
}: {
  label: string;
  value: string;
  alert?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
      <p className="text-[9px] uppercase font-black text-slate-500 tracking-wide">
        {label}
      </p>
      <p
        className={`text-xs font-black mt-0.5 ${
          alert ? "text-rose-500" : muted ? "text-slate-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
