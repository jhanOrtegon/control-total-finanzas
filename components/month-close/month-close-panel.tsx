"use client";

import React, { useState } from "react";
import { Lock, CheckCircle2 } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface MonthClosePanelProps {
  month: number;
  year: number;
}

export function MonthClosePanel({ month, year }: MonthClosePanelProps) {
  const { theme } = useTheme();
  const { getMonthlySummary, closeMonth, getSnapshot } = useFinance();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = getMonthlySummary(month, year);
  const existing = getSnapshot(month, year);

  const handleClose = async () => {
    setSaving(true);
    await closeMonth(month, year, summary, notes.trim() || undefined);
    setSaving(false);
  };

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            Cierre de mes — {MONTH_NAMES[month - 1]} {year}
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-1">
            Guarda una foto de tu economía para comparar evolución en el tiempo.
          </p>
        </div>
        {existing && (
          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Cerrado
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500">Ingresos</span>
          <p className="font-black text-emerald-500 mt-1">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500">Gastos</span>
          <p className="font-black text-amber-500 mt-1">
            {formatCurrency(summary.monthSpent)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500">Disponible</span>
          <p
            className={`font-black mt-1 ${summary.realAvailableCash >= 0 ? "text-indigo-500" : "text-rose-500"}`}
          >
            {formatCurrency(summary.realAvailableCash)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-500">Deuda</span>
          <p className="font-black text-rose-500 mt-1">
            {formatCurrency(summary.totalOutstandingDebt)}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">
          Notas del mes (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ej. Pagué extra la tarjeta, bajé gastos en comida…"
          className={`w-full border rounded-xl py-2 px-3 text-xs font-semibold resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${
            theme === "dark"
              ? "bg-slate-950 border-slate-800 text-white"
              : "bg-slate-50 border-slate-200"
          }`}
        />
      </div>

      <button
        type="button"
        onClick={handleClose}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer disabled:opacity-50"
      >
        {saving
          ? "Guardando cierre…"
          : existing
            ? "Actualizar cierre del mes"
            : "Cerrar y guardar este mes"}
      </button>
    </section>
  );
}
