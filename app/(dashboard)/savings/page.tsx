"use client";

import React, { useMemo } from "react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { SavingsGoalCard } from "@/components/dashboard/savings-goal-card";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { BudgetPaceCard } from "@/components/charts/budget-pace-card";
import { ProgressTrackers } from "@/components/dashboard/progress-trackers";
import { ImprovementTips } from "@/components/dashboard/improvement-tips";
import { ModuleHubLinks } from "@/components/shared/module-hub-links";

export default function SavingsPage() {
  const { month, year } = useFinancePeriod();
  const { getMonthlySummary } = useFinance();

  const summary = useMemo(
    () => getMonthlySummary(month, year),
    [getMonthlySummary, month, year]
  );

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">
          Ahorro y Estadísticas
        </h1>
        <p className="text-xs text-slate-500 font-semibold max-w-lg">
          Monitorea el cumplimiento de tus objetivos de ahorro, analiza la distribución de tus gastos e identifica oportunidades de mejora en tu salud financiera.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Row 1: Savings Goal (5 cols) & Category Donut Chart (7 cols) */}
        <div className="col-span-1 lg:col-span-5 flex flex-col">
          <SavingsGoalCard />
        </div>
        <div className="col-span-1 lg:col-span-7 flex flex-col">
          <CategoryDonutChart month={month} year={year} />
        </div>

        {/* Row 2: Progress Trackers (full width 12 cols) */}
        <div className="col-span-1 lg:col-span-12 flex flex-col">
          <ProgressTrackers
            monthlyIncome={summary.baseIncome}
            monthlyDebtMinimums={summary.monthlyDebtMinimums}
            totalOutstandingDebt={summary.totalOutstandingDebt}
            totalInitialDebt={summary.totalInitialDebt}
          />
        </div>

        {/* Row 3: Budget Pace (6 cols) & Improvement Tips (6 cols) */}
        <div className="col-span-1 lg:col-span-6 flex flex-col">
          <BudgetPaceCard month={month} year={year} />
        </div>
        <div className="col-span-1 lg:col-span-6 flex flex-col">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl shadow-sm h-full p-1">
            <ImprovementTips summary={summary} />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <ModuleHubLinks />
      </div>
    </div>
  );
}
