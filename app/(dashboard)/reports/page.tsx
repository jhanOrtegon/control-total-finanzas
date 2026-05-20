"use client";

import React from "react";
import { MonthlyDetailReport } from "@/components/reports/monthly-detail-report";
import { ModuleHubLinks } from "@/components/shared/module-hub-links";
import { CategorySpendingChart } from "@/components/charts/category-spending-chart";
import { MonthComparisonCard } from "@/components/month-close/month-comparison-card";
import { useFinancePeriod } from "@/providers/finance-period-provider";

export default function ReportsPage() {
  const { month, year } = useFinancePeriod();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <ModuleHubLinks />
      <MonthlyDetailReport />
      <CategorySpendingChart month={month} year={year} />
      <MonthComparisonCard month={month} year={year} />
    </div>
  );
}
