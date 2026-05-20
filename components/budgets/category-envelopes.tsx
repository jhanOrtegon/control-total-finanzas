"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Sparkles,
  Save,
  Copy,
  ArrowUpDown,
  CalendarClock,
} from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";
import { getCategoryEmoji } from "@/lib/constants";
import { spentByCategoryInMonth } from "@/lib/financial-events";
import {
  buildEnvelopeRows,
  computeEnvelopeTotals,
  getSpendablePool,
  suggestEnvelopeLimits,
  limitsFromMonthSpending,
  getCopyFromPreviousMonthSource,
  SPEND_CATEGORIES,
} from "@/lib/envelope-calculations";
import { formatCurrency } from "@/lib/utils";
import { EnvelopeAllocationChart } from "@/components/budgets/envelope-allocation-chart";
import { AlertCenter } from "@/components/alerts/alert-center";

type SortMode = "usage" | "name" | "remaining";

export function CategoryEnvelopes() {
  const { theme } = useTheme();
  const {
    categoryBudgets,
    upsertCategoryLimit,
    batchUpsertLimits,
    applySuggestedEnvelopes,
    expenses,
    budget,
    currentMonthSummary,
  } = useFinance();
  const { month, year, periodLabel } = useFinancePeriod();

  const spent = useMemo(
    () => spentByCategoryInMonth(expenses, month, year),
    [expenses, month, year],
  );

  const income = budget?.monthly_income ?? currentMonthSummary.baseIncome;
  const savingsGoal = budget?.monthly_savings_goal ?? 0;
  const monthlyBudget = budget?.monthly_budget ?? 0;
  const spendablePool = getSpendablePool(income, monthlyBudget, savingsGoal);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sortMode, setSortMode] = useState<SortMode>("usage");
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const cat of SPEND_CATEGORIES) {
      const row = categoryBudgets.find((c) => c.category === cat);
      next[cat] = row ? String(row.monthly_limit) : "";
    }
    setDrafts(next);
  }, [categoryBudgets]);

  const rows = useMemo(
    () => buildEnvelopeRows(categoryBudgets, spent),
    [categoryBudgets, spent],
  );

  const totals = useMemo(
    () => computeEnvelopeTotals(rows, spendablePool),
    [rows, spendablePool],
  );

  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (sortMode === "name") {
      list.sort((a, b) => a.category.localeCompare(b.category));
    } else if (sortMode === "remaining") {
      list.sort((a, b) => a.remaining - b.remaining);
    } else {
      list.sort((a, b) => b.pctUsed - a.pctUsed);
    }
    return list;
  }, [rows, sortMode]);

  const saveOne = async (category: string) => {
    const val = parseFloat(drafts[category] || "0");
    if (isNaN(val) || val < 0) return;
    await upsertCategoryLimit(category, val);
  };

  const saveAll = async () => {
    setSavingAll(true);
    const limits: Record<string, number> = {};
    for (const cat of SPEND_CATEGORIES) {
      const val = parseFloat(drafts[cat] || "0");
      limits[cat] = isNaN(val) || val < 0 ? 0 : val;
    }
    await batchUpsertLimits(limits);
    setSavingAll(false);
  };

  const applySuggested = async () => {
    if (spendablePool <= 0) return;
    const suggested = suggestEnvelopeLimits(spendablePool);
    setDrafts(
      Object.fromEntries(
        SPEND_CATEGORIES.map((c) => [c, String(suggested[c] ?? 0)]),
      ),
    );
    await applySuggestedEnvelopes(spendablePool);
  };

  const copyFromDrafts = () => {
    const suggested = suggestEnvelopeLimits(spendablePool);
    setDrafts(
      Object.fromEntries(
        SPEND_CATEGORIES.map((c) => [c, String(suggested[c] ?? 0)]),
      ),
    );
  };

  const copyFromPreviousMonth = async () => {
    const prev = getCopyFromPreviousMonthSource(month, year);
    const limits = limitsFromMonthSpending(expenses, prev.month, prev.year, {
      bufferPct: 5,
    });
    setDrafts(
      Object.fromEntries(
        SPEND_CATEGORIES.map((c) => [c, String(limits[c] ?? 0)]),
      ),
    );
    await batchUpsertLimits(limits);
  };

  const prevPeriod = getCopyFromPreviousMonthSource(month, year);

  return (
    <div className="space-y-6">
      <PoolBalanceBanner />
      <section
        className={`border rounded-3xl p-6 space-y-4 ${
          theme === "dark"
            ? "bg-slate-900/60 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            Resumen de sobres
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Pool disponible para gastos:{" "}
            <span className="text-slate-800 dark:text-slate-200 font-black">
              {formatCurrency(spendablePool)}
            </span>
            {monthlyBudget > 0
              ? " (presupuesto mensual en ajustes)"
              : " (ingreso − meta de ahorro)"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
          <MiniStat label="Total asignado" value={formatCurrency(totals.totalLimits)} />
          <MiniStat label="Gastado este mes" value={formatCurrency(totals.totalSpent)} />
          <MiniStat
            label="Sin asignar"
            value={formatCurrency(totals.unallocated)}
            highlight={totals.unallocated < 0}
          />
          <MiniStat
            label="Categorías en rojo"
            value={String(totals.overBudgetCategories)}
            highlight={totals.overBudgetCategories > 0}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={spendablePool <= 0}
            onClick={applySuggested}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Aplicar reparto sugerido
          </button>
          <button
            type="button"
            disabled={spendablePool <= 0}
            onClick={copyFromDrafts}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-[10px] font-black cursor-pointer disabled:opacity-40"
          >
            <Copy className="w-3.5 h-3.5" />
            Previsualizar sugerido
          </button>
          <button
            type="button"
            onClick={copyFromPreviousMonth}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-400/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black cursor-pointer"
            title={`Basado en gasto de ${prevPeriod.month}/${prevPeriod.year}`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Copiar del mes anterior (+5%)
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={savingAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black cursor-pointer disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar todos
          </button>
        </div>
      </section>

      <EnvelopeAllocationChart rows={rows} spendablePool={spendablePool} />

      <section
        className={`border rounded-3xl p-6 space-y-4 ${
          theme === "dark"
            ? "bg-slate-900/60 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black">Límites por categoría</h3>
            <p className="text-[10px] text-slate-500 font-semibold">
              Gasto comparado: {periodLabel}
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <ArrowUpDown className="w-3 h-3" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className={`border rounded-lg py-1 px-2 text-[10px] font-black cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-950 border-slate-800"
                  : "bg-white border-slate-200"
              }`}
            >
              <option value="usage">% usado</option>
              <option value="remaining">Menos disponible</option>
              <option value="name">Nombre</option>
            </select>
          </label>
        </div>

        <ul className="space-y-3">
          {sortedRows.map((row) => {
            const limit = parseFloat(drafts[row.category] || "0") || 0;
            const pct =
              limit > 0 ? Math.min(100, (row.spent / limit) * 100) : 0;

            return (
              <li
                key={row.category}
                className={`p-4 rounded-2xl border space-y-2 ${
                  row.over
                    ? "border-rose-500/40 bg-rose-500/5"
                    : theme === "dark"
                      ? "bg-slate-950/40 border-slate-800"
                      : "bg-slate-50 border-slate-150"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black">
                    {getCategoryEmoji(row.category)} {row.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${row.over ? "text-rose-500" : "text-slate-500"}`}
                  >
                    {formatCurrency(row.spent)}
                    {limit > 0 ? ` / ${formatCurrency(limit)}` : " (sin tope)"}
                  </span>
                </div>
                {limit > 0 && (
                  <>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${row.over ? "bg-rose-500" : "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-bold text-slate-500">
                      Disponible:{" "}
                      <span
                        className={
                          row.remaining < 0 ? "text-rose-500" : "text-emerald-600"
                        }
                      >
                        {formatCurrency(row.remaining)}
                      </span>
                      {row.over && " · Sobrepasado"}
                    </p>
                  </>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={drafts[row.category] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [row.category]: e.target.value,
                      }))
                    }
                    placeholder="Límite mensual COP"
                    className={`flex-1 border rounded-lg py-1.5 px-2 text-xs font-bold ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800"
                        : "bg-white border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => saveOne(row.category)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <AlertCenter
        month={month}
        year={year}
        compact
        kindFilter="category"
        title="Alertas de sobres"
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
      <p className="text-[9px] uppercase font-black text-slate-500">{label}</p>
      <p
        className={`text-sm font-black mt-0.5 ${highlight ? "text-rose-500" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
