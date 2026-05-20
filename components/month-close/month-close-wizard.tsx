"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { compareToPreviousSnapshot, getPreviousPeriod } from "@/lib/snapshot-comparison";
import { isDeltaPositive } from "@/lib/snapshot-comparison";

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

const STEPS = ["Revisión", "Resumen", "Confirmar"] as const;

interface MonthCloseWizardProps {
  month: number;
  year: number;
  onClosed?: () => void;
}

export function MonthCloseWizard({ month, year, onClosed }: MonthCloseWizardProps) {
  const { theme } = useTheme();
  const { getMonthlySummary, closeMonth, getSnapshot } = useFinance();
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = getMonthlySummary(month, year);
  const existing = getSnapshot(month, year);
  const { month: prevMonth, year: prevYear } = getPreviousPeriod(month, year);
  const previousSnapshot = getSnapshot(prevMonth, prevYear);
  const deltas = useMemo(
    () => compareToPreviousSnapshot(summary, previousSnapshot ?? null),
    [summary, previousSnapshot],
  );

  useEffect(() => {
    setNotes(existing?.notes ?? "");
    setStep(0);
  }, [month, year, existing?.id, existing?.notes]);

  const checklist = useMemo(() => {
    const items: { ok: boolean; text: string; href?: string }[] = [];
    items.push({
      ok: summary.pendingObligationsCount === 0,
      text:
        summary.pendingObligationsCount === 0
          ? "Todas las obligaciones del mes están marcadas"
          : `${summary.pendingObligationsCount} obligación(es) pendiente(s)`,
      href: "/schedule",
    });
    items.push({
      ok: summary.realAvailableCash >= 0,
      text:
        summary.realAvailableCash >= 0
          ? "Flujo del mes en positivo"
          : `Déficit de ${formatCurrency(Math.abs(summary.realAvailableCash))}`,
    });
    items.push({
      ok: summary.dtiRatio <= 36,
      text:
        summary.dtiRatio <= 36
          ? `DTI saludable (${summary.dtiRatio.toFixed(0)}%)`
          : `DTI elevado (${summary.dtiRatio.toFixed(0)}%) — prioriza bajar cuotas`,
    });
    return items;
  }, [summary]);

  const canAdvance = step < 2;
  const handleClose = async () => {
    setSaving(true);
    const ok = await closeMonth(month, year, summary, notes.trim() || undefined);
    setSaving(false);
    if (ok) onClosed?.();
  };

  return (
    <section
      className={`border rounded-3xl p-6 space-y-5 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            Cierre guiado — {MONTH_NAMES[month - 1]} {year}
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Paso {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>
        {existing && (
          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 shrink-0 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ya cerrado
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 h-1.5 rounded-full transition ${
              i <= step ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-800"
            }`}
            title={label}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" />
            Revisa antes de cerrar el mes:
          </p>
          <ul className="space-y-2">
            {checklist.map((item, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-semibold ${
                  item.ok
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    : "border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-300"
                }`}
              >
                {item.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>
                  {item.text}
                  {item.href && !item.ok && (
                    <>
                      {" "}
                      <Link href={item.href} className="underline font-black">
                        Ir a corregir
                      </Link>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
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

          {previousSnapshot && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-500">
                Cambio vs {MONTH_NAMES[prevMonth - 1]} {prevYear}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {deltas
                  .filter((d) =>
                    ["total_spent", "real_available_cash", "total_outstanding_debt"].includes(
                      d.key,
                    ),
                  )
                  .map((d) => {
                    const improved = isDeltaPositive(d);
                    return (
                      <div
                        key={d.key}
                        className={`p-2.5 rounded-lg border text-[11px] font-bold ${
                          theme === "dark"
                            ? "border-slate-800 bg-slate-950/40"
                            : "border-slate-150 bg-slate-50"
                        }`}
                      >
                        <span className="text-slate-500">{d.label}: </span>
                        {d.delta != null ? (
                          <span
                            className={
                              improved
                                ? "text-emerald-500"
                                : improved === false
                                  ? "text-rose-500"
                                  : ""
                            }
                          >
                            {d.delta >= 0 ? "+" : ""}
                            {formatCurrency(d.delta)}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold">
            Al confirmar, guardaremos esta foto financiera. Podrás actualizarla si
            registras movimientos después.
          </p>
          <label className="block text-[10px] uppercase font-bold text-slate-500">
            Aprendizajes del mes (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Qué funcionó, qué ajustarás el próximo mes…"
            className={`w-full border rounded-xl py-2 px-3 text-xs font-semibold resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 ${
              theme === "dark"
                ? "bg-slate-950 border-slate-800 text-white"
                : "bg-slate-50 border-slate-200"
            }`}
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>
        )}
        {canAdvance ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black cursor-pointer"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
          >
            {saving
              ? "Guardando…"
              : existing
                ? "Actualizar cierre del mes"
                : "Confirmar cierre del mes"}
          </button>
        )}
      </div>
    </section>
  );
}
