"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import { HealthAdvisor } from "@/components/dashboard/health-advisor";
import { ProgressTrackers } from "@/components/dashboard/progress-trackers";
import { ImprovementTips } from "@/components/dashboard/improvement-tips";
import { DueAlerts } from "@/components/dashboard/due-alerts";
import { MonthComparisonCard } from "@/components/month-close/month-comparison-card";
import { AlertCenter } from "@/components/alerts/alert-center";
import { BudgetPaceCard } from "@/components/charts/budget-pace-card";
import { EnvelopeSummary } from "@/components/budgets/envelope-summary";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";
import { ModuleHubLinks } from "@/components/shared/module-hub-links";
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
} from "lucide-react";

export default function OverviewPage() {
  const { month, year, isCurrentMonth, linkWithPeriod } = useFinancePeriod();
  const { budget, getMonthlySummary } = useFinance();

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

  return (
    <div className="space-y-8">
      {!isCurrentMonth && (
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
          Periodo histórico — cambia el mes desde el encabezado.
        </p>
      )}

      <PoolBalanceBanner dismissible />

      <DueAlerts />

      <MonthComparisonCard month={month} year={year} />

      {/* Métricas del mes */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(totalIncome)}
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          footer={
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
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
          icon={<TrendingDown className="w-4 h-4 text-amber-500" />}
          footer={
            <span
              className={
                budgetUsedPct > 100
                  ? "text-rose-500 font-bold"
                  : "text-slate-500"
              }
            >
              {budgetLimit > 0
                ? `${budgetUsedPct.toFixed(0)}% del presupuesto (${formatCurrency(budgetLimit)})`
                : "Sin tope de presupuesto configurado"}
            </span>
          }
        />

        <StatCard
          title="Deuda Total Restante"
          value={formatCurrency(totalOutstandingDebt)}
          icon={<TrendingDown className="w-4 h-4 text-rose-500" />}
          footer={<span>Capital pendiente de amortizar (global)</span>}
        />

        <StatCard
          title="Cuota Mínima Deudas/Mes"
          value={formatCurrency(monthlyDebtMinimums)}
          icon={<Coins className="w-4 h-4 text-amber-500" />}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnvelopeSummary month={month} year={year} compact />
        <Link
          href={linkWithPeriod("/reports")}
          className="border rounded-3xl p-6 flex flex-col justify-center gap-2 bg-indigo-600/10 border-indigo-500/30 hover:border-indigo-500/60 transition"
        >
          <FileBarChart className="w-8 h-8 text-indigo-500" />
          <span className="text-sm font-black">Informe detallado del mes</span>
          <span className="text-[10px] text-slate-500 font-semibold">
            Exportar CSV, imprimir y ver análisis completo →
          </span>
        </Link>
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

        <div className="border rounded-3xl p-6 space-y-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-black">Distribución de Deuda</h3>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Deuda Pagada:</span>
              <span className="text-emerald-500 font-bold">
                {formatCurrency(totalPaidOffDebt)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Deuda Pendiente:</span>
              <span className="text-rose-500 font-bold">
                {formatCurrency(totalOutstandingDebt)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-500 border-t pt-3 border-slate-200 dark:border-slate-800/80">
              <span>Deuda Inicial Total:</span>
              <span className="font-black">
                {formatCurrency(totalInitialDebt)}
              </span>
            </div>
            {summary.debtPaymentsInMonth > 0 && (
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Abonos este mes:</span>
                <span className="text-indigo-500 font-bold">
                  {formatCurrency(summary.debtPaymentsInMonth)}
                </span>
              </div>
            )}
          </div>

          <Link
            href="/debts"
            className="w-full bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer text-center block shadow-sm"
          >
            Ir a gestionar deudas
          </Link>
        </div>
      </section>
    </div>
  );
}
