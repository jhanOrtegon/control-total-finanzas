"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { HealthAdvisor } from "@/components/dashboard/health-advisor";
import { ProgressTrackers } from "@/components/dashboard/progress-trackers";
import { ImprovementTips } from "@/components/dashboard/improvement-tips";
import { DueAlerts } from "@/components/dashboard/due-alerts";
import { DaySummaryBanner } from "@/components/dashboard/day-summary-banner";
import { MonthComparisonCard } from "@/components/month-close/month-comparison-card";
import { AlertCenter } from "@/components/alerts/alert-center";
import { BudgetPaceCard } from "@/components/charts/budget-pace-card";
import { EnvelopeSummary } from "@/components/budgets/envelope-summary";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";
import { ModuleHubLinks } from "@/components/shared/module-hub-links";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { SavingsGoalCard } from "@/components/dashboard/savings-goal-card";
import { QuickAddModal } from "@/components/shared/quick-add-modal";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingDown,
  Coins,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  FileBarChart,
  Calendar,
  Download,
  PlusCircle,
} from "lucide-react";

export default function OverviewPage() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
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
      e.type === "recurrent" ? "Recurrente" : "Único",
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
    monthlyDebtMinimums,
    totalOutstandingDebt,
    totalInitialDebt,
    totalPaidOffDebt,
    realAvailableCash,
    pendingObligationsCount,
    extraIncome,
  } = summary;

  const budgetLimit = budget?.monthly_budget || 0;
  const budgetUsedPct =
    budgetLimit > 0 ? (monthSpent / budgetLimit) * 100 : 0;

  const debtPaidPct =
    totalInitialDebt > 0
      ? ((totalInitialDebt - totalOutstandingDebt) / totalInitialDebt) * 100
      : 0;

  return (
    <div className="space-y-8">
      {!isCurrentMonth && (
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
          Periodo histórico — cambia el mes desde el encabezado.
        </p>
      )}

      {/* Day summary banner — only on current period */}
      {isCurrentMonth && <DaySummaryBanner />}

      <PoolBalanceBanner dismissible />

      <DueAlerts />

      <MonthComparisonCard month={month} year={year} />

      {/* Métricas del mes */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                {extraIncome > 0
                  ? ` + ${formatCurrency(extraIncome)} extra`
                  : ""}
              </span>
            </span>
          }
        />

        <StatCard
          title="Gastado en el Mes"
          value={formatCurrency(monthSpent)}
          variant={
            budgetUsedPct > 100
              ? "danger"
              : budgetUsedPct > 80
                ? "warning"
                : "default"
          }
          accentColor={
            budgetUsedPct > 100
              ? "rose"
              : budgetUsedPct > 80
                ? "amber"
                : "indigo"
          }
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

        <StatCard
          title="Deuda Total Restante"
          value={formatCurrency(totalOutstandingDebt)}
          variant={totalOutstandingDebt > 0 ? "danger" : "success"}
          accentColor={totalOutstandingDebt > 0 ? "rose" : "emerald"}
          progressPct={debtPaidPct}
          icon={<TrendingDown className="w-4 h-4" />}
          footer={
            <span>{debtPaidPct.toFixed(0)}% del total inicial amortizado</span>
          }
        />

        <StatCard
          title="Cuota Mínima Deudas/Mes"
          value={formatCurrency(monthlyDebtMinimums)}
          variant="warning"
          accentColor="amber"
          icon={<Coins className="w-4 h-4" />}
          footer={<span>Compromiso mínimo mensual de deudas activas</span>}
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatCard
          title="Disponible Real (Mes)"
          value={formatCurrency(realAvailableCash)}
          variant={realAvailableCash >= 0 ? "success" : "danger"}
          icon={
            realAvailableCash >= 0 ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )
          }
          footer={
            realAvailableCash >= 0 ? (
              <span className="text-slate-500 font-semibold leading-relaxed">
                Tras gastos del mes y reservar meta de ahorro (
                {formatCurrency(savingsGoal)}).
              </span>
            ) : (
              <span className="text-rose-500 font-bold leading-relaxed">
                Déficit de {formatCurrency(Math.abs(realAvailableCash))} este
                mes. Revisa gastos o ingresos extra.
              </span>
            )
          }
        />

        <StatCard
          title="Obligaciones Pendientes"
          value={String(pendingObligationsCount)}
          icon={<Calendar className="w-4 h-4 text-indigo-500" />}
          footer={
            pendingObligationsCount > 0 ? (
              <Link
                href="/schedule"
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Ver en cronograma →
              </Link>
            ) : (
              <span className="text-emerald-500 font-bold">
                Mes al día en obligaciones
              </span>
            )
          }
        />
      </section>

      <ProgressTrackers
        monthlyIncome={summary.baseIncome}
        monthlyDebtMinimums={monthlyDebtMinimums}
        totalOutstandingDebt={totalOutstandingDebt}
        totalInitialDebt={totalInitialDebt}
      />

      <ImprovementTips summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertCenter month={month} year={year} compact />
        <BudgetPaceCard month={month} year={year} />
      </div>

      <EnvelopeSummary month={month} year={year} compact />

      {/* Category spending donut chart */}
      <CategoryDonutChart month={month} year={year} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={linkWithPeriod("/reports")}
          className="group border rounded-3xl p-6 flex flex-col justify-center gap-3 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-elegant-hover transition-all duration-300 hover:-translate-y-0.5"
        >
          <FileBarChart className="w-8 h-8 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-sm font-black block">
              Informe detallado del mes
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Ver análisis completo, gráficas y desglose →
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleExportCSV}
          className="group border rounded-3xl p-6 flex flex-col justify-center gap-3 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-elegant-hover transition-all duration-300 hover:-translate-y-0.5 text-left cursor-pointer"
        >
          <Download className="w-8 h-8 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform" />
          <div>
            <span className="text-sm font-black block">
              Exportar mes actual CSV
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Descarga directa de tus movimientos del mes ↓
            </span>
          </div>
        </button>
      </div>

      <ModuleHubLinks />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <HealthAdvisor
            monthlyIncome={totalIncome}
            monthlyBudget={budgetLimit}
            monthlySavingsGoal={savingsGoal}
            totalSpent={monthSpent}
            realAvailableCash={realAvailableCash}
          />
        </div>

        <SavingsGoalCard />
      </section>
    </div>
  );
}
