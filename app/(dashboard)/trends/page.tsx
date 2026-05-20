"use client";

import React, { useState } from "react";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { FinanceTrends } from "@/components/charts/finance-trends";
import { DebtTrendChart } from "@/components/charts/debt-trend-chart";
import { CategorySpendingChart } from "@/components/charts/category-spending-chart";
import { MonthCloseWizard } from "@/components/month-close/month-close-wizard";
import { SnapshotHistory } from "@/components/month-close/snapshot-history";
import { MonthComparisonCard } from "@/components/month-close/month-comparison-card";
import { AlertCenter } from "@/components/alerts/alert-center";
import { useTheme } from "@/providers/theme-provider";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { ModuleHubLinks } from "@/components/shared/module-hub-links";

export default function TrendsPage() {
  const { theme } = useTheme();
  const { month, year, linkWithPeriod } = useFinancePeriod();
  const [horizon, setHorizon] = useState<6 | 12>(6);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <p className="text-xs font-bold text-slate-500">
        Cierre de mes y análisis visual — periodo en el encabezado.
      </p>
      <Link
        href={linkWithPeriod("/reports")}
        className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:underline"
      >
        <FileBarChart className="w-3.5 h-3.5" />
        Abrir informe detallado del mes →
      </Link>

      <AlertCenter month={month} year={year} compact />

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setHorizon(6)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
            horizon === 6
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 dark:bg-slate-900 text-slate-500"
          }`}
        >
          6 meses
        </button>
        <button
          type="button"
          onClick={() => setHorizon(12)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
            horizon === 12
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 dark:bg-slate-900 text-slate-500"
          }`}
        >
          12 meses
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceTrends horizonMonths={horizon} />
        <DebtTrendChart months={horizon} />
      </div>

      <CategorySpendingChart month={month} year={year} />

      <ModuleHubLinks />

      <MonthComparisonCard month={month} year={year} />
      <MonthCloseWizard month={month} year={year} />
      <SnapshotHistory />
    </div>
  );
}
