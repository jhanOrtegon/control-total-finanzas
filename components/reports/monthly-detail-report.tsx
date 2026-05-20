"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Printer,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import { buildMonthlyDetailReport, reportToCsv } from "@/lib/monthly-report";
import { downloadCsv } from "@/lib/financial-events";
import { formatCurrency } from "@/lib/utils";
import { isDeltaPositive } from "@/lib/snapshot-comparison";
import { getCategoryEmoji } from "@/lib/constants";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";

export function MonthlyDetailReport() {
  const { theme } = useTheme();
  const { month, year, periodLabel, linkWithPeriod } = useFinancePeriod();
  const {
    budget,
    expenses,
    debts,
    debtPayments,
    categoryBudgets,
    snapshots,
    getMonthlySummary,
  } = useFinance();

  const report = useMemo(
    () =>
      buildMonthlyDetailReport(
        month,
        year,
        periodLabel,
        budget,
        expenses,
        debts,
        debtPayments,
        categoryBudgets,
        snapshots,
        getMonthlySummary(month, year),
      ),
    [
      month,
      year,
      periodLabel,
      budget,
      expenses,
      debts,
      debtPayments,
      categoryBudgets,
      snapshots,
      getMonthlySummary,
    ],
  );

  const handleCsv = () => {
    const csv = reportToCsv(report);
    downloadCsv(
      `informe-${year}-${String(month).padStart(2, "0")}.csv`,
      "\uFEFF" + csv,
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const card = `border rounded-3xl p-6 space-y-4 ${
    theme === "dark"
      ? "bg-slate-900/60 border-slate-800"
      : "bg-white border-slate-200"
  }`;

  return (
    <div className="space-y-6 print:space-y-4">
      <PoolBalanceBanner dismissible />

      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              Informe: {report.periodLabel}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {report.isMonthClosed
                ? "Mes cerrado con snapshot guardado."
                : "Mes abierto — puedes cerrarlo en Evolución y Cierre."}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={handleCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Ingresos" value={formatCurrency(report.summary.totalIncome)} good />
          <Metric label="Gastos" value={formatCurrency(report.summary.monthSpent)} />
          <Metric
            label="Disponible"
            value={formatCurrency(report.summary.realAvailableCash)}
            good={report.summary.realAvailableCash >= 0}
          />
          <Metric label="DTI" value={`${report.summary.dtiRatio.toFixed(1)}%`} />
        </div>
      </section>

      {report.comparison.length > 0 && (
        <section className={card}>
          <h3 className="text-sm font-black mb-3">vs mes anterior</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.comparison.slice(0, 6).map((d) => {
              if (d.delta == null) return null;
              const positive = isDeltaPositive(d);
              return (
                <li
                  key={d.key}
                  className="flex justify-between text-xs font-semibold p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50"
                >
                  <span className="text-slate-500">{d.label}</span>
                  <span className={positive ? "text-emerald-600" : "text-rose-500"}>
                    {d.delta >= 0 ? "+" : ""}
                    {d.key.includes("ratio") || d.key.includes("dti")
                      ? `${d.delta.toFixed(1)} pp`
                      : formatCurrency(d.delta)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className={card}>
        <h3 className="text-sm font-black flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-indigo-500" />
          Flujo y movimientos
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
          <span className="text-slate-500">
            Ingresos:{" "}
            <span className="text-emerald-600">
              {formatCurrency(report.movementTotals.income)}
            </span>
          </span>
          <span className="text-slate-500">
            Gastos:{" "}
            <span className="text-rose-500">
              {formatCurrency(report.movementTotals.expenses)}
            </span>
          </span>
          <span className="text-slate-500">
            Abonos:{" "}
            <span>{formatCurrency(report.movementTotals.debtPayments)}</span>
          </span>
          <span className="text-slate-500">
            Neto:{" "}
            <span
              className={
                report.movementTotals.netFlow >= 0
                  ? "text-emerald-600"
                  : "text-rose-500"
              }
            >
              {formatCurrency(report.movementTotals.netFlow)}
            </span>
          </span>
        </div>
        <Link
          href={linkWithPeriod("/history")}
          className="inline-block mt-3 text-[10px] font-black text-indigo-600 hover:underline print:hidden"
        >
          Ver libro completo →
        </Link>
        {report.topMovements.length > 0 && (
          <ul className="mt-4 space-y-2 border-t pt-3 border-slate-200 dark:border-slate-800">
            <p className="text-[10px] uppercase font-black text-slate-500">
              Mayores movimientos
            </p>
            {report.topMovements.map((e) => (
              <li
                key={e.id}
                className="flex justify-between text-xs font-semibold"
              >
                <span className="truncate pr-2">{e.title}</span>
                <span
                  className={
                    e.type === "income" ? "text-emerald-600" : "text-rose-500"
                  }
                >
                  {e.type === "income" ? "+" : "-"}
                  {formatCurrency(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h3 className="text-sm font-black mb-3">Categorías y sobres</h3>
        <p className="text-[10px] text-slate-500 font-semibold mb-2">
          Pool: {formatCurrency(report.spendablePool)} · Asignado:{" "}
          {formatCurrency(report.envelopeTotals.totalLimits)} ·{" "}
          {report.poolAnalysis.message}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-semibold">
            <thead>
              <tr className="text-slate-500 text-left border-b border-slate-200 dark:border-slate-800">
                <th className="py-2">Categoría</th>
                <th className="py-2 text-right">Gastado</th>
                <th className="py-2 text-right">Tope</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryRows
                .filter((r) => r.spent > 0 || r.limit > 0)
                .sort((a, b) => b.spent - a.spent)
                .map((row) => (
                  <tr
                    key={row.category}
                    className={`border-b border-slate-100 dark:border-slate-800/80 ${
                      row.over ? "text-rose-500" : ""
                    }`}
                  >
                    <td className="py-2">
                      {getCategoryEmoji(row.category)} {row.category}
                    </td>
                    <td className="py-2 text-right">{formatCurrency(row.spent)}</td>
                    <td className="py-2 text-right">
                      {row.limit > 0 ? formatCurrency(row.limit) : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {row.limit > 0 ? `${Math.round(row.pctUsed)}%` : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Link
          href={linkWithPeriod("/budgets")}
          className="inline-block mt-3 text-[10px] font-black text-indigo-600 hover:underline print:hidden"
        >
          Gestionar sobres →
        </Link>
      </section>

      <section className={card}>
        <h3 className="text-sm font-black mb-2">Deudas</h3>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <span>Activas: {report.debtOverview.count}</span>
          <span>Pendiente: {formatCurrency(report.debtOverview.outstanding)}</span>
          <span>Cuotas mín.: {formatCurrency(report.debtOverview.minimums)}</span>
          <span>Pagado hist.: {formatCurrency(report.debtOverview.paidOff)}</span>
        </div>
        <Link
          href="/debts"
          className="inline-block mt-2 text-[10px] font-black text-indigo-600 hover:underline print:hidden"
        >
          Ir a deudas →
        </Link>
      </section>

      <section className={card}>
        <h3 className="text-sm font-black mb-2">
          Alertas ({report.alertCounts.total})
        </h3>
        {report.alerts.length === 0 ? (
          <p className="text-xs text-emerald-600 font-bold">Sin alertas activas.</p>
        ) : (
          <ul className="space-y-2">
            {report.alerts.slice(0, 6).map((a) => (
              <li key={a.id} className="text-xs font-semibold flex gap-2">
                <span
                  className={
                    a.severity === "critical"
                      ? "text-rose-500"
                      : a.severity === "warning"
                        ? "text-amber-600"
                        : "text-indigo-500"
                  }
                >
                  •
                </span>
                <span>
                  <span className="font-black">{a.title}</span> — {a.message}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={linkWithPeriod("/alerts")}
          className="inline-block mt-2 text-[10px] font-black text-indigo-600 hover:underline print:hidden"
        >
          Centro de alertas →
        </Link>
      </section>

      <section className={card}>
        <h3 className="text-sm font-black mb-2 flex items-center gap-2">
          {report.summary.realAvailableCash >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-500" />
          )}
          Recomendaciones
        </h3>
        <ul className="list-disc list-inside text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1">
          {report.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
      <p className="text-[9px] uppercase font-black text-slate-500">{label}</p>
      <p
        className={`text-sm font-black mt-1 ${
          good === true
            ? "text-emerald-600"
            : good === false
              ? "text-rose-500"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
