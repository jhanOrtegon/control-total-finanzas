import type { Debt, DebtPayment, Expense, FinancialEvent } from "@/types";
import { isDebtPaymentExpense } from "@/lib/finance-calculations";

function eventDate(expense: Expense): string {
  return expense.paid_date || expense.due_date || expense.created_at;
}

export function buildFinancialEvents(
  expenses: Expense[],
  debtPayments: DebtPayment[],
  debts: Debt[],
): FinancialEvent[] {
  const debtById = new Map(debts.map((d) => [d.id, d]));
  const paymentExpenseIds = new Set(
    debtPayments.map((p) => p.expense_id).filter(Boolean),
  );

  const fromExpenses: FinancialEvent[] = expenses
    .filter((e) => !paymentExpenseIds.has(e.id) && e.status === "paid")
    .map((e) => ({
      id: `exp-${e.id}`,
      type: e.category === "Ingresos" ? "income" : "expense",
      date: eventDate(e),
      title: e.title,
      amount: e.amount,
      category: e.category,
      status: e.status,
    }));

  const fromPayments: FinancialEvent[] = debtPayments.map((p) => {
    const debt = debtById.get(p.debt_id);
    return {
      id: `pay-${p.id}`,
      type: "debt_payment" as const,
      date: p.paid_at,
      title: debt ? `Abono: ${debt.title}` : "Abono a deuda",
      amount: p.amount,
      category: "Deuda",
      debtId: p.debt_id,
      debtTitle: debt?.title,
      balanceAfter: p.balance_after,
    };
  });

  return [...fromExpenses, ...fromPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function filterEvents(
  events: FinancialEvent[],
  opts: {
    month?: number;
    year?: number;
    type?: FinancialEvent["type"] | "all";
    search?: string;
  },
): FinancialEvent[] {
  return events.filter((e) => {
    if (opts.type && opts.type !== "all" && e.type !== opts.type) return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      if (
        !e.title.toLowerCase().includes(q) &&
        !(e.category?.toLowerCase().includes(q) ?? false)
      ) {
        return false;
      }
    }
    if (opts.month && opts.year) {
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return false;
      if (d.getMonth() + 1 !== opts.month || d.getFullYear() !== opts.year) {
        return false;
      }
    }
    return true;
  });
}

export function eventsToCsv(events: FinancialEvent[]): string {
  const header = "Fecha,Tipo,Título,Categoría,Monto,Saldo después,Estado";
  const rows = events.map((e) => {
    const date = new Date(e.date).toISOString().slice(0, 10);
    const typeLabel =
      e.type === "income"
        ? "Ingreso"
        : e.type === "debt_payment"
          ? "Abono deuda"
          : "Gasto";
    return [
      date,
      typeLabel,
      `"${e.title.replace(/"/g, '""')}"`,
      e.category || "",
      e.amount,
      e.balanceAfter ?? "",
      e.status || "",
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Gastos del mes por categoría (excluye ingresos y abonos duplicados). */
export function spentByCategoryInMonth(
  expenses: Expense[],
  month: number,
  year: number,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    if (
      e.category === "Ingresos" ||
      isDebtPaymentExpense(e) ||
      e.status !== "paid"
    )
      continue;
    const dateStr = e.paid_date || e.due_date || e.created_at;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue;
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }
  return totals;
}
