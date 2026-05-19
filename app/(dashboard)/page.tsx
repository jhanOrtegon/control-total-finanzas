"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useBudget } from "@/hooks/use-budget";
import { useExpenses } from "@/hooks/use-expenses";
import { useDebts } from "@/hooks/use-debts";
import { StatCard } from "@/components/dashboard/stat-card";
import { HealthAdvisor } from "@/components/dashboard/health-advisor";
import { ProgressTrackers } from "@/components/dashboard/progress-trackers";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  TrendingDown,
  Coins,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

export default function OverviewPage() {
  const { user } = useAuth();

  // Custom hooks
  const { budget } = useBudget(user?.id);
  const { expenses } = useExpenses(user?.id);
  const { debts } = useDebts(user?.id);

  // Financial computations
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutstandingDebt = debts.reduce((acc, curr) => acc + curr.remaining_amount, 0);
  const totalInitialDebt = debts.reduce((acc, curr) => acc + curr.total_amount, 0);
  const monthlyDebtMinimums = debts.reduce((acc, curr) => acc + curr.minimum_payment, 0);

  const income = budget?.monthly_income || 0;
  const savingsGoal = budget?.monthly_savings_goal || 0;
  const budgetLimit = budget?.monthly_budget || 0;

  const realAvailableCash = income - totalSpent - savingsGoal - monthlyDebtMinimums;
  const totalPaidOffDebt = totalInitialDebt - totalOutstandingDebt;

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Stat */}
        <StatCard
          title="Ingresos Netos al Mes"
          value={formatCurrency(income)}
          icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          footer={
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tu sueldo o ingresos fijos del mes</span>
            </span>
          }
        />

        {/* Total Remaining Debt */}
        <StatCard
          title="Deuda Total Restante"
          value={formatCurrency(totalOutstandingDebt)}
          icon={<TrendingDown className="w-4 h-4 text-rose-500" />}
          variant="default"
          footer={
            <span className="flex items-center gap-1 text-rose-500 animate-pulse">
              <span>Capital total que debes amortizar</span>
            </span>
          }
        />

        {/* Monthly Debt obligations */}
        <StatCard
          title="Cuota de Deudas/Mes"
          value={formatCurrency(monthlyDebtMinimums)}
          icon={<Coins className="w-4 h-4 text-amber-500" />}
          footer={<span>Compromiso mínimo mensual de deudas</span>}
        />

        {/* Real Cash flow available */}
        <StatCard
          title="Dinero Disponible Real"
          value={formatCurrency(realAvailableCash)}
          variant={realAvailableCash >= 0 ? "success" : "danger"}
          icon={realAvailableCash >= 0 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
          footer={
            realAvailableCash >= 0 ? (
              <span className="text-slate-500 font-semibold leading-relaxed">
                Caja positiva tras pagar gastos, deudas y reservar ahorro.
              </span>
            ) : (
              <span className="text-rose-500 font-bold leading-relaxed">
                ¡Alerta! Estás gastando dinero que no tienes. Detén gastos.
              </span>
            )
          }
        />
      </section>

      {/* Progress metrics */}
      <ProgressTrackers
        monthlyIncome={income}
        monthlyDebtMinimums={monthlyDebtMinimums}
        totalOutstandingDebt={totalOutstandingDebt}
        totalInitialDebt={totalInitialDebt}
      />

      {/* Grid for advisor and summary */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <HealthAdvisor
            monthlyIncome={income}
            monthlyBudget={budgetLimit}
            monthlySavingsGoal={savingsGoal}
            totalSpent={totalSpent}
            realAvailableCash={realAvailableCash}
          />
        </div>

        <div className="border rounded-3xl p-6 space-y-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-black">Distribución de Deuda</h3>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Deuda Pagada:</span>
              <span className="text-emerald-500 font-bold">{formatCurrency(totalPaidOffDebt)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Deuda Pendiente:</span>
              <span className="text-rose-500 font-bold">{formatCurrency(totalOutstandingDebt)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-500 border-t pt-3 border-slate-200 dark:border-slate-800/80">
              <span>Deuda Inicial Total:</span>
              <span className="font-black">{formatCurrency(totalInitialDebt)}</span>
            </div>
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
