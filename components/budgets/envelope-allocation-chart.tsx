"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/providers/theme-provider";
import type { EnvelopeRow } from "@/lib/envelope-calculations";
import { formatCurrency } from "@/lib/utils";

interface EnvelopeAllocationChartProps {
  rows: EnvelopeRow[];
  spendablePool: number;
}

export function EnvelopeAllocationChart({
  rows,
  spendablePool,
}: EnvelopeAllocationChartProps) {
  const { theme } = useTheme();
  const data = rows
    .filter((r) => r.limit > 0 || r.spent > 0)
    .map((r) => ({
      name: r.category.slice(0, 8),
      asignado: r.limit,
      gastado: r.spent,
    }));

  if (data.length === 0) return null;

  return (
    <section
      className={`border rounded-3xl p-6 space-y-3 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div>
        <h3 className="text-sm font-black">Asignado vs gastado</h3>
        <p className="text-[10px] text-slate-500 font-semibold">
          Pool mensual: {formatCurrency(spendablePool)}
        </p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
              tickFormatter={(v) =>
                v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : String(v)
              }
            />
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              contentStyle={{
                fontSize: 11,
                borderRadius: 12,
                border: "none",
                background: theme === "dark" ? "#0f172a" : "#fff",
              }}
            />
            <Bar dataKey="asignado" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastado" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
