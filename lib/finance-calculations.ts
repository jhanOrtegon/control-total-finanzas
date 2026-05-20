import type { Debt, Expense, UserBudget } from "@/types";

/** Comprueba si una fecha ISO cae en el mes/año indicados. */
export function isDateInMonth(
  dateStr: string | null,
  targetMonth: number,
  targetYear: number,
): boolean {
  if (!dateStr) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split("-").map(Number);
    return year === targetYear && month === targetMonth;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  return (
    date.getMonth() + 1 === targetMonth && date.getFullYear() === targetYear
  );
}

export function getExpenseDateInMonth(expense: Expense, month: number, year: number) {
  const dateStr =
    expense.status === "paid"
      ? expense.paid_date || expense.due_date
      : expense.due_date || expense.paid_date;
  return isDateInMonth(dateStr, month, year);
}

export function isDebtPaymentExpense(expense: Expense) {
  return expense.title.toLowerCase().startsWith("abono a deuda:");
}

export function getRecurrentTemplates(expenses: Expense[]) {
  return expenses.filter((e) => e.type === "recurrent");
}

export interface MonthlyFinanceSummary {
  month: number;
  year: number;
  baseIncome: number;
  extraIncome: number;
  totalIncome: number;
  monthSpent: number;
  variableSpent: number;
  recurrentCommitted: number;
  debtPaymentsInMonth: number;
  savingsGoal: number;
  monthlyDebtMinimums: number;
  totalOutstandingDebt: number;
  totalInitialDebt: number;
  totalPaidOffDebt: number;
  realAvailableCash: number;
  dtiRatio: number;
  pendingObligationsCount: number;
}

export function computeMonthlySummary(
  budget: UserBudget | null,
  expenses: Expense[],
  debts: Debt[],
  month: number,
  year: number,
): MonthlyFinanceSummary {
  const recurrentTemplates = getRecurrentTemplates(expenses);
  const recurrentTitles = recurrentTemplates.map((e) => e.title.toLowerCase());

  const extraIncome = expenses
    .filter(
      (e) =>
        e.category === "Ingresos" &&
        e.type === "one-time" &&
        getExpenseDateInMonth(e, month, year),
    )
    .reduce((acc, e) => acc + e.amount, 0);

  const monthSpent = expenses
    .filter(
      (e) =>
        e.category !== "Ingresos" &&
        e.status === "paid" &&
        getExpenseDateInMonth(e, month, year),
    )
    .reduce((acc, e) => acc + e.amount, 0);

  const variableSpent = expenses
    .filter(
      (e) =>
        e.type === "one-time" &&
        e.status === "paid" &&
        e.category !== "Ingresos" &&
        getExpenseDateInMonth(e, month, year) &&
        !recurrentTitles.includes(e.title.toLowerCase()) &&
        !isDebtPaymentExpense(e),
    )
    .reduce((acc, e) => acc + e.amount, 0);

  const debtPaymentsInMonth = expenses
    .filter(
      (e) =>
        isDebtPaymentExpense(e) &&
        e.status === "paid" &&
        getExpenseDateInMonth(e, month, year),
    )
    .reduce((acc, e) => acc + e.amount, 0);

  const recurrentCommitted = recurrentTemplates.reduce(
    (acc, e) => acc + e.amount,
    0,
  );

  const activeDebts = debts.filter((d) => d.remaining_amount > 0);
  const monthlyDebtMinimums = activeDebts.reduce(
    (acc, d) => acc + d.minimum_payment,
    0,
  );
  const totalOutstandingDebt = debts.reduce(
    (acc, d) => acc + d.remaining_amount,
    0,
  );
  const totalInitialDebt = debts.reduce((acc, d) => acc + d.total_amount, 0);
  const totalPaidOffDebt = totalInitialDebt - totalOutstandingDebt;

  const baseIncome = budget?.monthly_income || 0;
  const savingsGoal = budget?.monthly_savings_goal || 0;
  // Prima legal: se paga en junio y diciembre (Colombia, equivale a medio salario mensual)
  let prima = 0;
  if (month === 6 || month === 12) {
    prima = baseIncome / 2;
  }
  const totalIncome = baseIncome + extraIncome + prima;

  const realAvailableCash = totalIncome - monthSpent - savingsGoal;
  const dtiRatio =
    baseIncome > 0 ? (monthlyDebtMinimums / baseIncome) * 100 : 0;

  const paidRecurrents = expenses.filter(
    (e) =>
      e.type === "one-time" &&
      e.status === "paid" &&
      getExpenseDateInMonth(e, month, year) &&
      recurrentTitles.includes(e.title.toLowerCase()),
  );

  let pendingObligationsCount = 0;
  for (const temp of recurrentTemplates) {
    const isPaid = paidRecurrents.some(
      (p) => p.title.toLowerCase() === temp.title.toLowerCase(),
    );
    if (!isPaid) pendingObligationsCount++;
  }

  for (const d of activeDebts) {
    const paid = debtPaymentsInMonth > 0 &&
      expenses.some(
        (e) =>
          isDebtPaymentExpense(e) &&
          e.status === "paid" &&
          getExpenseDateInMonth(e, month, year) &&
          e.title.toLowerCase().includes(d.title.toLowerCase()) &&
          e.amount >= d.minimum_payment,
      );
    if (!paid) pendingObligationsCount++;
  }

  const oneTimePending = expenses.filter(
    (e) =>
      e.type === "one-time" &&
      e.status === "pending" &&
      e.category !== "Ingresos" &&
      getExpenseDateInMonth(e, month, year) &&
      !recurrentTitles.includes(e.title.toLowerCase()) &&
      !isDebtPaymentExpense(e),
  );
  pendingObligationsCount += oneTimePending.length;

  return {
    month,
    year,
    baseIncome,
    extraIncome,
    totalIncome,
    monthSpent,
    variableSpent,
    recurrentCommitted,
    debtPaymentsInMonth,
    savingsGoal,
    monthlyDebtMinimums,
    totalOutstandingDebt,
    totalInitialDebt,
    totalPaidOffDebt,
    realAvailableCash,
    dtiRatio,
    pendingObligationsCount,
  };
}

export function computeDebtTotals(debts: Debt[]) {
  const totalOutstandingDebt = debts.reduce(
    (acc, d) => acc + d.remaining_amount,
    0,
  );
  const totalInitialDebt = debts.reduce((acc, d) => acc + d.total_amount, 0);
  const monthlyDebtMinimums = debts.reduce(
    (acc, d) => acc + d.minimum_payment,
    0,
  );
  return {
    totalOutstandingDebt,
    totalInitialDebt,
    totalPaidOffDebt: totalInitialDebt - totalOutstandingDebt,
    monthlyDebtMinimums,
  };
}

export type DtiLevel = "healthy" | "warning" | "critical";

export function getDtiLevel(dtiRatio: number): DtiLevel {
  if (dtiRatio > 36) return "critical";
  if (dtiRatio >= 20) return "warning";
  return "healthy";
}

export function spentByCategoryInMonth(
  expenses: Expense[],
  category: string,
  month: number,
  year: number
): number {
  return expenses
    .filter(
      (e) =>
        e.category === category &&
        e.status === "paid" &&
        getExpenseDateInMonth(e, month, year)
    )
    .reduce((acc, e) => acc + e.amount, 0);
}

