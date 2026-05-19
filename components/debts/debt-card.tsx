"use client";

import React from "react";
import { Debt } from "@/types";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { Coins, Edit3, Trash2, Eye } from "lucide-react";

interface DebtCardProps {
  debt: Debt;
  isEditing: boolean;
  onAbonarClick: (id: string) => void;
  onStartEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onViewDetail: (debt: Debt) => void;
}

export function DebtCard({
  debt,
  isEditing,
  onAbonarClick,
  onStartEdit,
  onDelete,
  onViewDetail,
}: DebtCardProps) {
  const { theme } = useTheme();
  const isFullyPaid = debt.remaining_amount <= 0;

  const paidPercentage = debt.total_amount > 0
    ? ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100
    : 0;

  return (
    <div
      className={`border rounded-2xl p-5 space-y-4 transition shadow-md ${
        isFullyPaid
          ? theme === "dark"
            ? "bg-emerald-950/20 border-emerald-500/50"
            : "bg-emerald-50 border-emerald-300"
          : isEditing
          ? theme === "dark"
            ? "bg-indigo-950/20 border-indigo-500/70"
            : "bg-indigo-50 border-indigo-500/60"
          : theme === "dark"
          ? "bg-slate-900/55 border-slate-800/80 hover:border-slate-700/80"
          : "bg-white border-slate-200 hover:border-indigo-200/80 hover:shadow-lg hover:shadow-indigo-500/5"
      }`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Left Info */}
        <div>
          <div className="flex items-center gap-2">
            <h4 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              {debt.title}
            </h4>
            {isFullyPaid && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                Pagada
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-semibold">
            <span>Deuda Total: <strong>{formatCurrency(debt.total_amount)}</strong></span>
            {debt.due_date && <span>Límite de pago: <strong>{debt.due_date}</strong></span>}
          </div>
        </div>

        {/* Right Info: Pay minimum & abonos */}
        <div className="flex sm:flex-col items-end gap-2 sm:gap-1.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
          <div className="text-right">
            <span className="block text-[10px] text-slate-500 font-bold uppercase">Saldo Restante</span>
            <span className={`text-lg font-black ${isFullyPaid ? "text-emerald-500" : "text-rose-500"}`}>
              {formatCurrency(debt.remaining_amount)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] text-slate-500 font-bold">Cuota Mínima/Mes: <strong>{formatCurrency(debt.minimum_payment)}</strong></span>
          </div>
        </div>
      </div>

      {/* Progress bar inside debt card */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
          <span>Amortización: {paidPercentage.toFixed(0)}% pagado</span>
          <span>Resta: {formatCurrency(debt.remaining_amount)}</span>
        </div>
        <div className={`w-full rounded-full h-2 overflow-hidden p-0.5 ${theme === "dark" ? "bg-slate-950 border border-slate-900" : "bg-slate-100 border border-slate-200"}`}>
          <div
            className="h-full rounded-full bg-linear-to-r from-rose-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(paidPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Payoff Actions */}
      <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/60 pt-3">
        <button
          onClick={() => onAbonarClick(debt.id)}
          disabled={isFullyPaid}
          className="bg-emerald-600/10 text-emerald-650 dark:text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/25 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
        >
          <Coins className="w-3.5 h-3.5 animate-bounce" />
          {isFullyPaid ? "Deuda Saldada" : "Abonar a Deuda"}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onViewDetail(debt)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-indigo-500/10 hover:text-indigo-400 border-slate-700/60 text-slate-400"
                : "bg-slate-100 hover:bg-indigo-500/10 hover:text-indigo-500 border-slate-200 text-slate-500"
            }`}
            title="Ver detalle"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStartEdit(debt)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-400 hover:text-white"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 hover:text-slate-800"
            }`}
            title="Editar parámetros"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(debt.id)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              theme === "dark"
                ? "bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 border-slate-700/60 text-slate-400"
                : "bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 border-slate-200 text-slate-500"
            }`}
            title="Eliminar de la lista"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
