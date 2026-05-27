"use client";

import React, { useMemo } from "react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CalendarClock } from "lucide-react";
import { getRecurrentTemplates, getExpenseDateInMonth, isDebtApplicableToMonth, isDebtDeferredInMonth, isDebtPaymentExpense, isDeferDebtExpense, isSystemExpense } from "@/lib/finance-calculations";

export default function OverviewPage() {
  const { month, year } = useFinancePeriod();
  const { debts, expenses } = useFinance();

  const pendingItems = useMemo(() => {
    const items = [];
    const recurrentTemplates = getRecurrentTemplates(expenses);
    const recurrentTitles = recurrentTemplates.map((e) => e.title.toLowerCase());

    const paidRecurrents = expenses.filter(
      (e) =>
        e.type === "one-time" &&
        e.status === "paid" &&
        getExpenseDateInMonth(e, month, year) &&
        recurrentTitles.includes(e.title.toLowerCase()),
    );

    for (const temp of recurrentTemplates) {
      const paymentsForTemp = paidRecurrents.filter(
        (p) => p.title.toLowerCase() === temp.title.toLowerCase(),
      );
      const amountPaid = paymentsForTemp.reduce((acc, p) => acc + p.amount, 0);
      
      if (amountPaid < temp.amount) {
        items.push({
          id: temp.id,
          title: temp.title,
          amount: temp.amount - amountPaid,
          type: 'recurrent',
          dueDate: temp.due_date,
        });
      }
    }

    const activeDebts = debts.filter((d) =>
      isDebtApplicableToMonth(d, month, year, expenses)
    );
    const debtPaymentsInMonth = expenses
      .filter(
        (e) =>
          isDebtPaymentExpense(e) &&
          e.status === "paid" &&
          getExpenseDateInMonth(e, month, year),
      )
      .reduce((acc, e) => acc + e.amount, 0);

    for (const d of activeDebts) {
      if (isDebtDeferredInMonth(d.id, expenses, month, year)) continue;

      const paid = debtPaymentsInMonth > 0 &&
        expenses.some(
          (e) =>
            isDebtPaymentExpense(e) &&
            e.status === "paid" &&
            getExpenseDateInMonth(e, month, year) &&
            e.title.toLowerCase().includes(d.title.toLowerCase()) &&
            e.amount >= d.minimum_payment,
        );
      if (!paid) {
        items.push({
          id: d.id,
          title: `Cuota: ${d.title}`,
          amount: d.minimum_payment,
          type: 'debt',
          dueDate: d.due_date,
        });
      }
    }

    const oneTimePending = expenses.filter(
      (e) =>
        e.type === "one-time" &&
        e.status === "pending" &&
        e.category !== "Ingresos" &&
        getExpenseDateInMonth(e, month, year) &&
        !recurrentTitles.includes(e.title.toLowerCase()) &&
        !isDebtPaymentExpense(e) &&
        !isDeferDebtExpense(e) &&
        !isSystemExpense(e),
    );

    for (const e of oneTimePending) {
      items.push({
        id: e.id,
        title: e.title,
        amount: e.amount,
        type: 'one-time',
        dueDate: e.due_date,
      });
    }

    return items;
  }, [expenses, debts, month, year]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-indigo-500" />
        Por vencer en {month}/{year}
      </h2>

      {pendingItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-3xl dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 font-medium">No hay elementos pendientes para este mes.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingItems.map((item, index) => (
              <li key={`${item.id}-${index}`} className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                      <span className="capitalize">{item.type === 'debt' ? 'Deuda' : item.type === 'recurrent' ? 'Fijo' : 'Único'}</span>
                      {item.dueDate && <span>• Vence: {item.dueDate}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(item.amount)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
