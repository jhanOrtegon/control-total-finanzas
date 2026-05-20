"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, GitCompare } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import {
  compareToPreviousSnapshot,
  getPreviousPeriod,
  isDeltaPositive,
} from "@/lib/snapshot-comparison";

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

interface MonthComparisonCardProps {
  month: number;
  year: number;
}

export function MonthComparisonCard({ month, year }: MonthComparisonCardProps) {
  const { theme } = useTheme();
  const { getMonthlySummary, snapshots, getSnapshot } = useFinance();

  const { month: prevMonth, year: prevYear } = getPreviousPeriod(month, year);
  const previousSnapshot = getSnapshot(prevMonth, prevYear);
  const summary = getMonthlySummary(month, year);

  const deltas = useMemo(
    () => compareToPreviousSnapshot(summary, previousSnapshot ?? null),
    [summary, previousSnapshot],
  );

  if (!previousSnapshot) {
    const hasAnyClose = snapshots.length > 0;
    return (
      <section
        className={`border rounded-3xl p-5 ${
          theme === "dark"
            ? "bg-slate-900/40 border-slate-800"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <p className="text-xs font-bold text-slate-500">
          {hasAnyClose
            ? `Sin cierre de ${MONTH_NAMES[prevMonth - 1]} ${prevYear}. Cierra meses anteriores para ver comparación.`
            : "Cierra tu primer mes en Evolución y Cierre para comparar progreso mes a mes."}
        </p>
        <Link
          href="/trends"
          className="inline-block mt-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Ir a cierre de mes →
        </Link>
      </section>
    );
  }

  const highlight = deltas.filter((d) =>
    ["total_spent", "real_available_cash", "total_outstanding_debt"].includes(
      d.key,
    ),
  );

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-indigo-500" />
          vs {MONTH_NAMES[prevMonth - 1]} {prevYear} (cerrado)
        </h3>
        <Link
          href="/trends"
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
        >
          Detalle
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {highlight.map((d) => {
          const improved = isDeltaPositive(d);
          const isPct = d.key === "dti_ratio";
          const fmt = (n: number) =>
            isPct ? `${n.toFixed(1)}%` : formatCurrency(n);

          return (
            <div
              key={d.key}
              className={`p-3 rounded-xl border text-xs ${
                theme === "dark"
                  ? "bg-slate-950/50 border-slate-800"
                  : "bg-slate-50 border-slate-150"
              }`}
            >
              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                {d.label}
              </span>
              <span className="text-sm font-black block mt-1">
                {fmt(d.current)}
              </span>
              {d.delta != null && (
                <span
                  className={`flex items-center gap-0.5 text-[10px] font-bold mt-1 ${
                    improved === true
                      ? "text-emerald-500"
                      : improved === false
                        ? "text-rose-500"
                        : "text-slate-500"
                  }`}
                >
                  {improved ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {d.delta >= 0 ? "+" : ""}
                  {isPct ? `${d.delta.toFixed(1)} pp` : formatCurrency(d.delta)}
                  {d.deltaPct != null && !isPct && (
                    <span className="opacity-70 ml-1">
                      ({d.deltaPct > 0 ? "+" : ""}
                      {d.deltaPct.toFixed(0)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
