"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import { useConfirm } from "@/providers/confirm-provider";
import {
  buildFinancialEvents,
  filterEvents,
  eventsToCsv,
  downloadCsv,
} from "@/lib/financial-events";
import { formatCurrency } from "@/lib/utils";
import { Pagination } from "@/components/shared/pagination";
import { Download, History, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const TYPE_LABELS = {
  all: "Todos",
  expense: "Gastos",
  income: "Ingresos",
  debt_payment: "Abonos deuda",
} as const;

export default function HistoryPage() {
  const { theme } = useTheme();
  const { expenses, debtPayments, debts, deleteExpense, undoDebtPayment } =
    useFinance();
  const confirm = useConfirm();

  const { month, year, setPeriod, periodLabel, linkWithPeriod } = useFinancePeriod();
  const [typeFilter, setTypeFilter] =
    useState<keyof typeof TYPE_LABELS>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const allEvents = useMemo(
    () => buildFinancialEvents(expenses, debtPayments, debts),
    [expenses, debtPayments, debts],
  );

  const filtered = useMemo(
    () =>
      filterEvents(allEvents, {
        month,
        year,
        type: typeFilter === "all" ? "all" : typeFilter,
        search: search.trim() || undefined,
      }),
    [allEvents, month, year, typeFilter, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleExport = () => {
    const csv = eventsToCsv(filtered);
    downloadCsv(`historial-${year}-${String(month).padStart(2, "0")}.csv`, csv);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (eventId.startsWith("exp-")) {
      const expenseId = eventId.replace("exp-", "");
      const ok = await confirm({
        title: "Eliminar movimiento",
        description:
          "Este gasto/ingreso se eliminará del historial y dejará de afectar los cálculos del periodo.",
        confirmLabel: "Sí, eliminar",
        variant: "danger",
      });
      if (!ok) return;
      await deleteExpense(expenseId);
      return;
    }

    if (eventId.startsWith("pay-")) {
      const paymentId = eventId.replace("pay-", "");
      const ok = await confirm({
        title: "Anular abono de deuda",
        description:
          "Se revertirá este abono y se recalculará el saldo de la deuda. Esta acción eliminará su impacto en historial y métricas.",
        confirmLabel: "Sí, anular abono",
        variant: "danger",
      });
      if (!ok) return;
      await undoDebtPayment(paymentId);
      return;
    }

    toast.error("No se pudo identificar el movimiento a eliminar.");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <section
        className={`p-6 border rounded-3xl ${
          theme === "dark"
            ? "bg-slate-900/60 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <h2 className="text-lg font-black flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-500" />
          Libro de movimientos
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Trazabilidad unificada: gastos, ingresos y abonos a deuda (
          {periodLabel}).
        </p>
        <Link
          href={linkWithPeriod("/reports")}
          className="inline-block mt-2 text-[10px] font-black text-indigo-600 hover:underline"
        >
          Ver informe detallado del periodo →
        </Link>

        <div className="flex flex-wrap gap-3 mt-4">
          <select
            value={month}
            onChange={(e) => {
              setPeriod(Number(e.target.value), year);
              setPage(1);
            }}
            title="Seleccionar mes"
            className={`border rounded-xl py-2 px-3 text-xs font-bold ${
              theme === "dark"
                ? "bg-slate-950 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Mes {i + 1}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => {
              setPeriod(month, Number(e.target.value));
              setPage(1);
            }}
            title="Seleccionar año"
            placeholder="Año"
            className={`w-24 border rounded-xl py-2 px-3 text-xs font-bold ${
              theme === "dark"
                ? "bg-slate-950 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as keyof typeof TYPE_LABELS);
              setPage(1);
            }}
            title="Filtrar por tipo de movimiento"
            className={`border rounded-xl py-2 px-3 text-xs font-bold ${
              theme === "dark"
                ? "bg-slate-950 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            {Object.entries(TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar…"
              className={`w-full border rounded-xl py-2 pl-9 pr-3 text-xs font-semibold ${
                theme === "dark"
                  ? "bg-slate-950 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </section>

      <section
        className={`border rounded-3xl overflow-hidden ${
          theme === "dark"
            ? "bg-slate-900/40 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        {pageItems.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500 font-bold">
            No hay movimientos para este filtro.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead
              className={`text-[10px] uppercase font-bold text-slate-500 border-b ${
                theme === "dark" ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Saldo deuda</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {pageItems.map((ev) => (
                <tr
                  key={ev.id}
                  className={`border-b ${
                    theme === "dark"
                      ? "border-slate-850 hover:bg-slate-950/30"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(ev.date).toLocaleDateString("es-CO")}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        ev.type === "income"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : ev.type === "debt_payment"
                            ? "bg-indigo-500/10 text-indigo-600"
                            : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {ev.type === "debt_payment"
                        ? "Abono deuda"
                        : ev.type === "income"
                          ? "Ingreso"
                          : "Gasto"}
                    </span>
                  </td>
                  <td className="py-3 px-4">{ev.title}</td>
                  <td
                    className={`py-3 px-4 text-right font-black ${
                      ev.type === "income"
                        ? "text-emerald-500"
                        : "text-slate-800 dark:text-white"
                    }`}
                  >
                    {ev.type === "income" ? "+" : "-"}
                    {formatCurrency(ev.amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500">
                    {ev.balanceAfter != null
                      ? formatCurrency(ev.balanceAfter)
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                      title={
                        ev.type === "debt_payment"
                          ? "Anular abono"
                          : "Eliminar movimiento"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="p-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </section>
    </div>
  );
}
