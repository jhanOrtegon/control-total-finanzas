"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";

const MONTH_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

interface DebtTrendChartProps {
  months?: number;
}

export function DebtTrendChart({ months = 12 }: DebtTrendChartProps) {
  const { theme } = useTheme();
  const { snapshots, getMonthlySummary } = useFinance();

  const chartData = useMemo(() => {
    const now = new Date();
    const points: { label: string; deuda: number; cerrado: boolean }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const snap = snapshots.find((s) => s.month === month && s.year === year);
      const live = getMonthlySummary(month, year);
      points.push({
        label: `${MONTH_SHORT[month - 1]} ${String(year).slice(2)}`,
        deuda: snap?.total_outstanding_debt ?? live.totalOutstandingDebt,
        cerrado: !!snap,
      });
    }
    return points;
  }, [snapshots, getMonthlySummary, months]);

  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";
  const maxDebt = Math.max(...chartData.map((d) => d.deuda), 1);
  const minDebt = Math.min(...chartData.map((d) => d.deuda));
  const reduction = chartData.length >= 2 ? chartData[0].deuda - chartData[chartData.length - 1].deuda : 0;

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-black">Evolución de deuda</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Últimos {months} meses · puntos con cierre guardado son más fiables
          </p>
        </div>
        {reduction !== 0 && (
          <span
            className={`text-xs font-black px-2 py-1 rounded-lg ${
              reduction > 0
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-rose-500/10 text-rose-600"
            }`}
          >
            {reduction > 0 ? "↓" : "↑"} {formatCurrency(Math.abs(reduction))} en el periodo
          </span>
        )}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 10 }} />
            <YAxis
              domain={[0, maxDebt * 1.05]}
              tick={{ fill: textColor, fontSize: 10 }}
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}k`
              }
            />
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              contentStyle={{
                background: theme === "dark" ? "#0f172a" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 12,
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="deuda"
              name="Deuda restante"
              stroke="#f43f5e"
              fill="url(#debtGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {minDebt === 0 && (
        <p className="text-[10px] font-bold text-emerald-500 text-center">
          ¡Llegaste a cero deuda en algún punto del periodo!
        </p>
      )}
    </section>
  );
}
