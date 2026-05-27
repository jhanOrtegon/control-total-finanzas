"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, CalendarClock, CreditCard, RefreshCw } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { formatCurrency } from "@/lib/utils";
import {
  getRecurrentTemplates,
  getExpenseDateInMonth,
  isDebtApplicableToMonth,
  isDebtDeferredInMonth,
  isDebtPaymentExpense,
  isDeferDebtExpense,
  isSystemExpense
} from "@/lib/finance-calculations";

export function DueAlerts() {
  const { expenses, debts } = useFinance();
  const { theme } = useTheme();
  const { month, year } = useFinancePeriod();

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

  if (pendingItems.length === 0) return null;

  return (
    <section
      className={`border rounded-3xl p-5 space-y-4 ${
        theme === "dark"
          ? "bg-amber-950/20 border-amber-900/40"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="space-y-2">
        <h3 className="text-sm font-black flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <CalendarClock className="w-4 h-4" />
          Por vencer en {month}/{year} ({pendingItems.length})
        </h3>
        <ul className="space-y-2">
          {pendingItems.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl text-xs border ${
                theme === "dark"
                  ? "bg-slate-950/50 border-slate-800"
                  : "bg-white border-amber-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.type === 'debt' ? (
                  <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />
                ) : item.type === 'recurrent' ? (
                  <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-bold truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-500">
                    <span className="capitalize">{item.type === 'debt' ? 'Deuda' : item.type === 'recurrent' ? 'Fijo' : 'Único'}</span>
                    {item.dueDate && ` • Vence: ${item.dueDate}`}
                  </p>
                </div>
              </div>
              <span className="font-black text-rose-500 shrink-0">
                {formatCurrency(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Cronograma →
        </Link>
        <Link
          href="/alerts"
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Todas las alertas →
        </Link>
      </div>
    </section>
  );
}
