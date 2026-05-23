"use client";

import React from "react";
import { Expense } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getCategoryEmoji, getCategoryColor } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tag, Calendar, CreditCard } from "lucide-react";

interface ExpenseDetailDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailDialog({ expense, open, onOpenChange }: ExpenseDetailDialogProps) {
  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            {expense.title}
          </DialogTitle>
          <DialogDescription>Detalle del gasto registrado</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Amount highlight */}
          <div className="text-center py-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(expense.amount)}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">COP</p>
          </div>

          {/* Info rows */}
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Categoría
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${getCategoryColor(expense.category)}`}>
                {getCategoryEmoji(expense.category)} {expense.category}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Tipo</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                expense.type === "recurrent"
                  ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              }`}>
                {expense.type === "recurrent" ? "Gasto Fijo" : "Gasto Variable"}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Registrado</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {new Date(expense.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
