"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { HealthAdvisor } from "@/components/dashboard/health-advisor";
import { DueAlerts } from "@/components/dashboard/due-alerts";
import { DaySummaryBanner } from "@/components/dashboard/day-summary-banner";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";
import { ModuleHubLinks } from "@/components/shared/module-hub-links";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  Download,
  PiggyBank,
} from "lucide-react";

export default function OverviewPage() {
  const { month, year, isCurrentMonth, linkWithPeriod } = useFinancePeriod();
  const { budget, getMonthlySummary, expenses } = useFinance();

  const handleExportCSV = () => {
    const now = new Date();
    const currentMonth = month;
    const currentYear = year;
    const monthExpenses = expenses.filter((e) => {
      const refDate =
        e.status === "paid"
          ? e.paid_date || e.created_at
          : e.due_date || e.created_at;
      if (!refDate) return false;
      if (/^\d{4}-\d{2}-\d{2}$/.test(refDate)) {
        const [y, m] = refDate.split("-").map(Number);
        return y === currentYear && m === currentMonth;
      }
      const d = new Date(refDate);
      return (
        !isNaN(d.getTime()) &&
        d.getFullYear() === currentYear &&
        d.getMonth() + 1 === currentMonth
      );
    });
    const headers = [
      "Concepto",
      "Monto",
      "Categoría",
      "Tipo",
      "Estado",
      "Fecha",
    ];
    const rows = monthExpenses.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      e.type === "recurrent" ? "Fijo" : "Único",
      e.status === "paid" ? "Pagado" : "Pendiente",
      e.paid_date || e.due_date || e.created_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos-${currentYear}-${String(currentMonth).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(
    () => getMonthlySummary(month, year),
    [getMonthlySummary, month, year],
  );

  const {
    totalIncome,
    monthSpent,
    savingsGoal,
    totalOutstandingDebt,
    totalInitialDebt,
    realAvailableCash,
    extraIncome,
    totalPendingToPay,
  } = summary;

  const budgetLimit = budget?.monthly_budget || 0;
  const budgetUsedPct =
    budgetLimit > 0 ? (monthSpent / budgetLimit) * 100 : 0;

  const debtPaidPct =
    totalInitialDebt > 0
      ? ((totalInitialDebt - totalOutstandingDebt) / totalInitialDebt) * 100
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-5 auto-rows-min">
      {/* Banners and Alerts - Full Width */}
      <div className="col-span-1 md:col-span-6 xl:col-span-12 space-y-4">
        {!isCurrentMonth && (
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
            Periodo histórico — cambia el mes desde el encabezado.
          </p>
        )}
        {isCurrentMonth && <DaySummaryBanner />}
        <PoolBalanceBanner dismissible />
        <DueAlerts />
      </div>


      {/* KPIs Principales - Fila 1 */}
      <div className="col-span-1 md:col-span-3 xl:col-span-3">
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(totalIncome)}
          variant="success"
          accentColor="emerald"
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          footer={
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>
                Base {formatCurrency(summary.baseIncome)}
                {extraIncome > 0 ? ` + ${formatCurrency(extraIncome)} extra` : ""}
              </span>
            </span>
          }
        />
      </div>

      <div className="col-span-1 md:col-span-3 xl:col-span-3">
        <StatCard
          title="Pagado (Mes)"
          value={formatCurrency(monthSpent)}
          variant={budgetUsedPct > 100 ? "danger" : budgetUsedPct > 80 ? "warning" : "default"}
          accentColor={budgetUsedPct > 100 ? "rose" : budgetUsedPct > 80 ? "amber" : "indigo"}
          progressPct={budgetUsedPct}
          icon={<TrendingDown className="w-4 h-4" />}
          footer={
            <span>
              {budgetLimit > 0
                ? `${budgetUsedPct.toFixed(0)}% del presupuesto (${formatCurrency(budgetLimit)})`
                : "Sin tope de presupuesto configurado"}
            </span>
          }
        />
      </div>

      <div className="col-span-1 md:col-span-3 xl:col-span-3">
        <StatCard
          title="Disponible Real (Mes)"
          value={formatCurrency(realAvailableCash)}
          variant={realAvailableCash >= 0 ? "success" : "danger"}
          icon={realAvailableCash >= 0 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
          footer={
            realAvailableCash >= 0 ? (
              <span className="text-slate-500 font-semibold leading-relaxed">
                Tras gastos pagados, pendientes y ahorro ({formatCurrency(savingsGoal)}).
              </span>
            ) : (
              <span className="text-rose-500 font-bold leading-relaxed">
                Déficit de {formatCurrency(Math.abs(realAvailableCash))} este mes.
              </span>
            )
          }
        />
      </div>

      <div className="col-span-1 md:col-span-3 xl:col-span-3">
        <StatCard
          title="Por Pagar (Mes)"
          value={formatCurrency(totalPendingToPay > 0 ? -totalPendingToPay : 0)}
          variant={totalPendingToPay > 0 ? "danger" : "default"}
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          footer={
            <span className="text-slate-500 font-semibold leading-relaxed">
              Lo que aún falta por pagar.
            </span>
          }
        />
      </div>

      <div className="col-span-1 md:col-span-3 xl:col-span-3">
        <StatCard
          title="Deuda Restante"
          value={formatCurrency(totalOutstandingDebt)}
          variant={totalOutstandingDebt > 0 ? "danger" : "success"}
          accentColor={totalOutstandingDebt > 0 ? "rose" : "emerald"}
          progressPct={debtPaidPct}
          icon={<TrendingDown className="w-4 h-4" />}
          footer={<span>{debtPaidPct.toFixed(0)}% amortizado</span>}
        />
      </div>

      {/* AI Health Advisor - Full Width */}
      <div className="col-span-1 md:col-span-6 xl:col-span-12 flex flex-col gap-5">
        <HealthAdvisor
          monthlyIncome={totalIncome}
          monthlyBudget={budgetLimit}
          monthlySavingsGoal={savingsGoal}
          totalSpent={monthSpent}
          realAvailableCash={realAvailableCash}
        />
      </div>

      {/* Modulos y Acciones Rapidas */}
      <div className="col-span-1 md:col-span-6 xl:col-span-12 mt-4 border-t border-slate-200 dark:border-slate-800 pt-6">
        <ModuleHubLinks />
      </div>

      <div className="col-span-1 md:col-span-6 xl:col-span-6">
        <Link
          href={linkWithPeriod("/savings")}
          className="group h-full border rounded-3xl p-6 flex flex-col justify-center gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-elegant-hover transition-all duration-300 hover:-translate-y-0.5"
        >
          <PiggyBank className="w-8 h-8 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-sm font-black block">Ahorro y Estadísticas del Mes</span>
            <span className="text-xs text-slate-500 font-semibold">Ver metas, DTI y ritmo de presupuesto →</span>
          </div>
        </Link>
      </div>
      <div className="col-span-1 md:col-span-6 xl:col-span-6">
        <button
          type="button"
          onClick={handleExportCSV}
          className="group w-full h-full border rounded-3xl p-6 flex flex-col justify-center gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-elegant-hover transition-all duration-300 hover:-translate-y-0.5 text-left cursor-pointer"
        >
          <Download className="w-8 h-8 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-sm font-black block">Exportar mes actual CSV</span>
            <span className="text-xs text-slate-500 font-semibold">Descarga directa de tus movimientos ↓</span>
          </div>
        </button>
      </div>
    </div>
  );
}
