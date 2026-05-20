"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFinance } from "@/providers/finance-provider";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES_LIST, getCategoryEmoji } from "@/lib/constants";
import { getExpenseDateInMonth } from "@/lib/finance-calculations";

const COLORS = [
  "#334155", // slate-700
  "#0f766e", // teal-700
  "#9a3412", // orange-800 (muted)
  "#be123c", // rose-700
  "#3730a3", // indigo-800
  "#0369a1", // sky-700
  "#5b21b6", // violet-800
  "#475569", // slate-600
];

interface CategoryDonutChartProps {
  month: number;
  year: number;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    emoji: string;
    percentage: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 shadow-lg text-xs">
      <p className="font-black text-slate-800 dark:text-slate-100">
        {entry.emoji} {entry.name}
      </p>
      <p className="text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
        {formatCurrency(entry.value)}
      </p>
      <p className="text-slate-400 font-semibold">
        {entry.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function CategoryDonutChart({ month, year }: CategoryDonutChartProps) {
  const { expenses } = useFinance();

  const { chartData, total } = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const expense of expenses) {
      if (
        expense.status !== "paid" ||
        expense.category === "Ingresos" ||
        !getExpenseDateInMonth(expense, month, year)
      ) {
        continue;
      }
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
    }

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    const data = Object.entries(totals)
      .map(([categoryName, value]) => {
        const catInfo = CATEGORIES_LIST.find((c) => c.name === categoryName);
        return {
          name: categoryName,
          emoji: catInfo?.emoji ?? "💼",
          value,
          percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    return { chartData: data, total: grandTotal };
  }, [expenses, month, year]);

  if (chartData.length === 0) {
    return (
      <section className="border rounded-3xl p-6 space-y-4 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <h3 className="text-base font-black">Distribución por Categoría</h3>
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-slate-400 font-semibold">
            Sin gastos registrados este mes
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border rounded-3xl p-6 space-y-4 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <h3 className="text-base font-black">Distribución por Categoría</h3>

      {/* Donut chart with centered total */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={52}
              dataKey="value"
              nameKey="name"
              strokeWidth={2}
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(total)}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              gastado
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="overflow-x-auto">
        <div className="flex flex-wrap gap-x-4 gap-y-2 min-w-0">
          {chartData.map((entry, index) => (
            <div
              key={entry.name}
              className="flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {getCategoryEmoji(entry.name)} {entry.name}
              </span>
              <span className="font-black text-slate-800 dark:text-slate-200">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
