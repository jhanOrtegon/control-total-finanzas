"use client";

import React, { useState } from "react";
import { Archive, ChevronDown, ChevronUp } from "lucide-react";
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

export function SnapshotHistory() {
  const { theme } = useTheme();
  const { snapshots } = useFinance();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (snapshots.length === 0) {
    return (
      <section
        className={`border rounded-3xl p-6 text-center ${
          theme === "dark"
            ? "bg-slate-900/40 border-slate-800"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <Archive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500">
          Aún no has cerrado ningún mes. Usa el asistente de arriba para crear tu
          primer registro histórico.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`border rounded-3xl p-6 space-y-3 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <h3 className="text-base font-black flex items-center gap-2">
        <Archive className="w-5 h-5 text-slate-500" />
        Historial de cierres ({snapshots.length})
      </h3>

      <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {snapshots.map((snap) => {
          const open = expandedId === snap.id;
          return (
            <li
              key={snap.id}
              className={`border rounded-2xl overflow-hidden ${
                theme === "dark" ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : snap.id)}
                className={`w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer ${
                  theme === "dark" ? "hover:bg-slate-950/50" : "hover:bg-slate-50"
                }`}
              >
                <div>
                  <span className="text-xs font-black">
                    {MONTH_NAMES[snap.month - 1]} {snap.year}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Cerrado{" "}
                    {new Date(snap.closed_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-black ${
                      snap.real_available_cash >= 0
                        ? "text-indigo-500"
                        : "text-rose-500"
                    }`}
                  >
                    {formatCurrency(snap.real_available_cash)}
                  </span>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {open && (
                <div
                  className={`px-4 pb-4 pt-0 grid grid-cols-2 gap-2 text-[11px] font-semibold border-t ${
                    theme === "dark"
                      ? "border-slate-800 bg-slate-950/30"
                      : "border-slate-100 bg-slate-50/80"
                  }`}
                >
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">
                      Ingresos
                    </span>
                    <span className="text-emerald-500 font-black">
                      {formatCurrency(snap.total_income)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">
                      Gastos
                    </span>
                    <span className="text-amber-600 font-black">
                      {formatCurrency(snap.total_spent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">
                      Deuda
                    </span>
                    <span className="text-rose-500 font-black">
                      {formatCurrency(snap.total_outstanding_debt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">
                      DTI
                    </span>
                    <span className="font-black">{snap.dti_ratio.toFixed(1)}%</span>
                  </div>
                  {snap.notes && (
                    <p className="col-span-2 text-slate-500 italic pt-2 border-t border-slate-200 dark:border-slate-800">
                      &ldquo;{snap.notes}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
