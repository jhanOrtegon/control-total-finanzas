"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";

const MONTH_SHORT = [
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

interface FinanceTrendsProps {
  horizonMonths?: 6 | 12;
}

export function FinanceTrends({ horizonMonths = 6 }: FinanceTrendsProps) {
  const { snapshots, getMonthlySummary } = useFinance();
  const { theme } = useTheme();
  const span = horizonMonths - 1;

  const chartData = useMemo(() => {
    const now = new Date();
    const points: {
      label: string;
      ingresos: number;
      gastos: number;
      patrimonio: number;
      deuda: number;
    }[] = [];

    for (let i = span; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const snap = snapshots.find((s) => s.month === month && s.year === year);
      const live = getMonthlySummary(month, year);

      points.push({
        label: `${MONTH_SHORT[month - 1]} ${year}`,
        ingresos: snap?.total_income ?? live.totalIncome,
        gastos: snap?.total_spent ?? live.monthSpent,
        patrimonio: snap?.real_available_cash ?? live.realAvailableCash,
        deuda: snap?.total_outstanding_debt ?? live.totalOutstandingDebt,
      });
    }
    return points;
  }, [snapshots, getMonthlySummary, span]);

  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

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
          Evolución (últimos {horizonMonths} meses)
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
          Usa cierres de mes guardados cuando existan; si no, datos en vivo del
          periodo.
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 10 }} />
            <YAxis
              tick={{ fill: textColor, fontSize: 10 }}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                    ? `${(v / 1_000).toFixed(0)}k`
                    : String(v)
              }
            />
            <Tooltip
              formatter={(value) =>
                formatCurrency(typeof value === "number" ? value : Number(value))
              }
              contentStyle={{
                background: theme === "dark" ? "#0f172a" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 12,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="ingresos"
              name="Ingresos"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="gastos"
              name="Gastos"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="patrimonio"
              name="Disponible"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="deuda"
              name="Deuda restante"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
