"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Wallet } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { getCategoryEnvelopeStatus } from "@/lib/envelope-calculations";
import { formatCurrency } from "@/lib/utils";

interface CategoryBudgetHintProps {
  category: string;
  amount?: number;
  month?: number;
  year?: number;
}

export function CategoryBudgetHint({
  category,
  amount = 0,
  month,
  year,
}: CategoryBudgetHintProps) {
  const { categoryBudgets, expenses } = useFinance();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const status = useMemo(
    () =>
      getCategoryEnvelopeStatus(
        category,
        categoryBudgets,
        expenses,
        m,
        y,
        amount,
      ),
    [category, categoryBudgets, expenses, m, y, amount],
  );

  if (!status || category === "Ingresos") return null;

  if (status.limit <= 0) {
    return (
      <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
        <Wallet className="w-3 h-3" />
        Sin tope en esta categoría.{" "}
        <Link href="/budgets" className="text-indigo-600 font-bold hover:underline">
          Configurar sobres
        </Link>
      </p>
    );
  }

  const draftRemaining = status.remaining ?? 0;

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-[10px] font-semibold space-y-0.5 ${
        status.wouldExceed
          ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          : draftRemaining < status.limit * 0.15
            ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
            : "bg-indigo-500/5 border-indigo-500/20 text-slate-600 dark:text-slate-300"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {status.wouldExceed && <AlertTriangle className="w-3 h-3 shrink-0" />}
        <span>
          Sobre {category}: gastado {formatCurrency(status.spent)} de{" "}
          {formatCurrency(status.limit)}
        </span>
      </div>
      {amount > 0 && (
        <span className="block font-black">
          {status.wouldExceed
            ? `Este gasto superaría el tope por ${formatCurrency(Math.abs(draftRemaining))}`
            : `Quedarían ${formatCurrency(Math.max(0, draftRemaining))} disponibles`}
        </span>
      )}
      {!amount && status.remaining !== null && (
        <span className="block font-bold text-slate-500">
          Disponible: {formatCurrency(Math.max(0, status.remaining))}
        </span>
      )}
    </div>
  );
}
