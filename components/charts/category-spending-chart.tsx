"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { spentByCategoryInMonth } from "@/lib/financial-events";
import { CATEGORIES_LIST } from "@/lib/constants";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
];

interface CategorySpendingChartProps {
  month: number;
  year: number;
}

export function CategorySpendingChart({ month, year }: CategorySpendingChartProps) {
  const { theme } = useTheme();
  const { expenses, categoryBudgets } = useFinance();

  const chartData = useMemo(() => {
    const spent = spentByCategoryInMonth(expenses, month, year);
    return CATEGORIES_LIST.filter((c) => c.name !== "Ingresos")
      .map((c) => {
        const gastado = spent[c.name] ?? 0;
        const limit =
          categoryBudgets.find((b) => b.category === c.name)?.monthly_limit ?? 0;
        return {
          name: c.name,
          gastado,
          limite: limit,
          sobre: limit > 0 && gastado > limit,
        };
      })
      .filter((d) => d.gastado > 0 || d.limite > 0)
      .sort((a, b) => b.gastado - a.gastado);
  }, [expenses, categoryBudgets, month, year]);

  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  if (chartData.length === 0) {
    return null;
  }

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div>
        <h3 className="text-base font-black">
          Gasto por categoría ({month}/{year})
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
          Barras rojas = superaste el tope del sobre configurado.
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: textColor, fontSize: 10 }}
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1e3).toFixed(0)}k` : String(v)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tick={{ fill: textColor, fontSize: 10 }}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "gastado" ? "Gastado" : "Tope",
              ]}
              contentStyle={{
                background: theme === "dark" ? "#0f172a" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 12,
                fontSize: 11,
              }}
            />
            <Bar dataKey="gastado" name="gastado" radius={[0, 6, 6, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={entry.sobre ? "#f43f5e" : COLORS[i % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
