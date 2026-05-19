"use client";

import React from "react";
import { Debt } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar, CreditCard, TrendingDown, Wallet, Hash, PlayCircle } from "lucide-react";

interface DebtDetailDialogProps {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtDetailDialog({ debt, open, onOpenChange }: DebtDetailDialogProps) {
  if (!debt) return null;

  const paidPercentage = debt.total_amount > 0
    ? ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100
    : 0;

  const paidAmount = debt.total_amount - debt.remaining_amount;

  const monthsRemaining = debt.minimum_payment > 0
    ? Math.ceil(debt.remaining_amount / debt.minimum_payment)
    : null;

  const installments = debt.installments ?? null;
  const startMonth = debt.start_month ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            {debt.title}
          </DialogTitle>
          <DialogDescription>Detalle completo de la deuda</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Progreso de pago</span>
              <span>{paidPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full rounded-full h-3 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div
                className="h-full rounded-full bg-linear-to-r from-rose-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(paidPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Wallet className="w-3.5 h-3.5" /> Monto Total
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(debt.total_amount)}</p>
            </div>
            <div className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <TrendingDown className="w-3.5 h-3.5" /> Saldo Restante
              </div>
              <p className="text-sm font-black text-rose-500">{formatCurrency(debt.remaining_amount)}</p>
            </div>
            <div className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <CreditCard className="w-3.5 h-3.5" /> Pagado
              </div>
              <p className="text-sm font-black text-emerald-500">{formatCurrency(paidAmount)}</p>
            </div>
            <div className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5" /> Cuota Mínima/Mes
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(debt.minimum_payment)}</p>
            </div>
          </div>

          {/* Additional info */}
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            {debt.due_date && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fecha de vencimiento
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{debt.due_date}</span>
              </div>
            )}
            {installments && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Número de cuotas
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{installments}</span>
              </div>
            )}
            {startMonth && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" /> Mes de inicio
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{startMonth}</span>
              </div>
            )}
            {monthsRemaining && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Meses estimados restantes
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{monthsRemaining} meses</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Registrado el</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {new Date(debt.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
