"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";

interface PeriodSelectorProps {
  compact?: boolean;
  showToday?: boolean;
}

export function PeriodSelector({ compact, showToday = true }: PeriodSelectorProps) {
  const { theme } = useTheme();
  const { periodLabel, shiftMonth, goToToday, isCurrentMonth } = useFinancePeriod();

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "p-2 rounded-xl border border-slate-200 dark:border-slate-800"}`}>
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className={`p-2 rounded-xl border cursor-pointer ${
          theme === "dark" ? "border-slate-800" : "border-slate-200"
        }`}
        title="Mes anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span
        className={`font-black text-center ${compact ? "text-xs min-w-[5rem] sm:min-w-28" : "text-sm min-w-40"}`}
      >
        {periodLabel}
      </span>
      <button
        type="button"
        onClick={() => shiftMonth(1)}
        className={`p-2 rounded-xl border cursor-pointer ${
          theme === "dark" ? "border-slate-800" : "border-slate-200"
        }`}
        title="Mes siguiente"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      {showToday && !isCurrentMonth && (
        <button
          type="button"
          onClick={goToToday}
          className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-indigo-600 text-white cursor-pointer"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
