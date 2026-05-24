"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/providers/auth-provider";
import { useBudget } from "@/hooks/use-budget";
import { useExpenses } from "@/hooks/use-expenses";
import { useDebts } from "@/hooks/use-debts";
import { useDebtPayments } from "@/hooks/use-debt-payments";
import { useMonthlySnapshots } from "@/hooks/use-monthly-snapshots";
import { useCategoryBudgets } from "@/hooks/use-category-budgets";
import { useRealtime } from "@/hooks/use-realtime";
import {
  computeMonthlySummary,
  spentByCategoryInMonth,
  isSystemExpense,
  type MonthlyFinanceSummary,
} from "@/lib/finance-calculations";
import { buildFinancialEvents } from "@/lib/financial-events";
import {
  registerServiceWorker,
  requestNotificationPermission,
  schedulePaymentReminders,
  checkOverduePayments,
} from "@/lib/push-notifications";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type {
  CategoryBudget,
  Debt,
  DebtPayment,
  Expense,
  FinancialEvent,
  MonthlySnapshot,
  UserBudget,
} from "@/types";
import type { ConnectionState } from "@insforge/sdk";

interface FinanceContextType {
  budget: UserBudget | null;
  expenses: Expense[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  snapshots: MonthlySnapshot[];
  categoryBudgets: CategoryBudget[];
  financialEvents: FinancialEvent[];
  loading: boolean;
  lastSyncedAt: Date | null;
  sessionCount: number;
  connectionState: ConnectionState;
  refetchAll: () => Promise<void>;
  getMonthlySummary: (month: number, year: number) => MonthlyFinanceSummary;
  currentMonthSummary: MonthlyFinanceSummary;
  budgetLoading: boolean;
  expensesLoading: boolean;
  debtsLoading: boolean;
  paymentsLoading: boolean;
  snapshotsLoading: boolean;
  categoryBudgetsLoading: boolean;
  updateBudget: ReturnType<typeof useBudget>["updateBudget"];
  addExpense: ReturnType<typeof useExpenses>["addExpense"];
  updateExpense: ReturnType<typeof useExpenses>["updateExpense"];
  deleteExpense: ReturnType<typeof useExpenses>["deleteExpense"];
  toggleExpenseStatus: ReturnType<typeof useExpenses>["toggleExpenseStatus"];
  addDebt: ReturnType<typeof useDebts>["addDebt"];
  updateDebt: ReturnType<typeof useDebts>["updateDebt"];
  deleteDebt: ReturnType<typeof useDebts>["deleteDebt"];
  recordDebtPayment: ReturnType<typeof useDebts>["recordDebtPayment"];
  undoDebtPayment: ReturnType<typeof useDebts>["undoDebtPayment"];
  deferDebtMonth: ReturnType<typeof useDebts>["deferDebtMonth"];
  undoDeferDebtMonth: ReturnType<typeof useDebts>["undoDeferDebtMonth"];
  closeMonth: ReturnType<typeof useMonthlySnapshots>["closeMonth"];
  getSnapshot: ReturnType<typeof useMonthlySnapshots>["getSnapshot"];
  upsertCategoryLimit: ReturnType<typeof useCategoryBudgets>["upsertCategoryLimit"];
  batchUpsertLimits: ReturnType<typeof useCategoryBudgets>["batchUpsertLimits"];
  applySuggestedEnvelopes: ReturnType<
    typeof useCategoryBudgets
  >["applySuggestedEnvelopes"];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [sessionCount, setSessionCount] = useState(1);

  const {
    budget,
    loading: budgetLoading,
    updateBudget,
    refetchBudget,
    applyRealtimeBudget,
  } = useBudget(userId);

  const {
    expenses,
    loading: expensesLoading,
    addExpense: addExpenseRaw,
    updateExpense: updateExpenseRaw,
    deleteExpense: deleteExpenseRaw,
    toggleExpenseStatus: toggleExpenseStatusRaw,
    refetchExpenses,
    applyRealtimeExpense,
  } = useExpenses(userId);

  const {
    debts,
    loading: debtsLoading,
    addDebt: addDebtRaw,
    updateDebt: updateDebtRaw,
    deleteDebt: deleteDebtRaw,
    recordDebtPayment: recordDebtPaymentRaw,
    undoDebtPayment: undoDebtPaymentRaw,
    deferDebtMonth: deferDebtMonthRaw,
    undoDeferDebtMonth: undoDeferDebtMonthRaw,
    refetchDebts,
    applyRealtimeDebt,
  } = useDebts(userId);

  const {
    payments: debtPayments,
    loading: paymentsLoading,
    refetchPayments,
  } = useDebtPayments(userId);

  const {
    snapshots,
    loading: snapshotsLoading,
    closeMonth,
    getSnapshot,
    refetchSnapshots,
  } = useMonthlySnapshots(userId);

  const {
    categoryBudgets,
    loading: categoryBudgetsLoading,
    upsertCategoryLimit,
    batchUpsertLimits,
    applySuggestedEnvelopes,
    refetchCategoryBudgets,
    applyRealtimeCategoryBudget,
  } = useCategoryBudgets(userId);

  const touchSync = useCallback(() => {
    setLastSyncedAt(new Date());
  }, []);

  // Realtime
  const { connectionState } = useRealtime(userId, {
    onExpenseChange: applyRealtimeExpense,
    onDebtChange: applyRealtimeDebt,
    onDebtPaymentChange: (_op) => {
      refetchDebts();
      refetchPayments();
    },
    onBudgetChange: applyRealtimeBudget,
    onCategoryBudgetChange: applyRealtimeCategoryBudget,
    onSessionCount: setSessionCount,
    onRealtimeEvent: (type, op, title) => {
      const labels: Record<string, string> = {
        expense: "Gasto",
        debt: "Deuda",
        payment: "Abono",
        budget: "Presupuesto",
      };
      const opLabels: Record<string, string> = {
        INSERT: "agregado",
        UPDATE: "actualizado",
        DELETE: "eliminado",
      };
      const entity = labels[type] || type;
      const action = opLabels[op] || op;
      const desc = title ? `${entity}: ${title}` : entity;
      // We still update the UI data via touchSync, but we don't spam the user with a toast
      // if it's their own action triggering the realtime event.
      touchSync();
    },
  });

  // Push notifications setup
  useEffect(() => {
    registerServiceWorker();
    // Notification permission should only be requested upon user interaction (e.g., button click)
    // to prevent iOS Safari from crashing or blocking the page load.
  }, []);

  // Payment reminders (once per day)
  useEffect(() => {
    if (expenses.length === 0 && debts.length === 0) return;
    schedulePaymentReminders(expenses, debts);
    checkOverduePayments(expenses, debts);
  }, [expenses, debts]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchBudget(),
      refetchExpenses(),
      refetchDebts(),
      refetchPayments(),
      refetchSnapshots(),
      refetchCategoryBudgets(),
    ]);
    touchSync();
  }, [
    refetchBudget,
    refetchExpenses,
    refetchDebts,
    refetchPayments,
    refetchSnapshots,
    refetchCategoryBudgets,
    touchSync,
  ]);

  const wrap =
    <T extends (...args: never[]) => Promise<unknown>>(fn: T): T =>
    (async (...args: Parameters<T>) => {
      const result = await fn(...args);
      touchSync();
      return result;
    }) as T;

  const writeSystemLog = useCallback(async (actionType: string, message: string, details?: Record<string, any>) => {
    try {
      const MAX_LOG_TITLE_LENGTH = 255;
      const safeActionType = actionType.replace(/\|\|\|/g, " ").trim();
      const safeMessage = message.replace(/\|\|\|/g, " ").trim();
      const prefix = `LOG:${safeActionType}|||`;
      const availableMessage = Math.max(
        0,
        MAX_LOG_TITLE_LENGTH - prefix.length,
      );
      const boundedMessage = safeMessage.slice(0, availableMessage);

      let detailsStr = "";
      if (details) {
        const compactDetails = {
          id: details.id,
          title: details.title,
          amount: details.amount,
          category: details.category,
          status: details.status,
          type: details.type,
          old: details.old
            ? {
                title: details.old.title,
                amount: details.old.amount,
                category: details.old.category,
                status: details.old.status,
                type: details.old.type,
              }
            : undefined,
          new: details.new
            ? {
                title: details.new.title,
                amount: details.new.amount,
                category: details.new.category,
                status: details.new.status,
                type: details.new.type,
              }
            : undefined,
        };

        const serialized = JSON.stringify(compactDetails);
        const detailsCandidate = `|||${serialized}`;
        if (
          (prefix + boundedMessage + detailsCandidate).length <=
          MAX_LOG_TITLE_LENGTH
        ) {
          detailsStr = detailsCandidate;
        }
      }

      await addExpenseRaw({
        title: `${prefix}${boundedMessage}${detailsStr}`,
        amount: 0,
        category: "LOG",
        type: "one-time",
        status: "paid",
        due_date: new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      // ignore
    }
  }, [addExpenseRaw]);

  // addExpense with budget threshold warning
  const addExpense = useCallback(
    async (payload: Parameters<typeof addExpenseRaw>[0]) => {
      const result = await addExpenseRaw(payload);
      if (result && budget) {
        if (!isSystemExpense(result)) {
           const cat = result.category === "Ingresos" ? "ingreso" : result.type === "recurrent" ? "plantilla recurrente" : "gasto";
           writeSystemLog("CREAR", `Registraste un ${cat} llamado '${result.title}' por ${formatCurrency(result.amount)}`, result);
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const allExpenses = [...expenses, result];
        const spent = spentByCategoryInMonth(allExpenses, payload.category, month, year);
        const limit = categoryBudgets.find((c) => c.category === payload.category)?.monthly_limit ?? 0;
        if (limit > 0) {
          const pct = spent / limit;
          if (pct >= 1) {
            toast.warning(`Limite superado en ${payload.category}`, {
              description: `Gastado: ${formatCurrency(spent)} de ${formatCurrency(limit)}`,
            });
          } else if (pct >= 0.8) {
            toast.warning(`80% del limite en ${payload.category}`, {
              description: `Gastado: ${formatCurrency(spent)} de ${formatCurrency(limit)}`,
            });
          }
        }
      }
      touchSync();
      return result;
    },
    [addExpenseRaw, budget, expenses, categoryBudgets, touchSync, writeSystemLog],
  );

  const updateExpense = useCallback(async (...args: Parameters<typeof updateExpenseRaw>) => {
    const id = args[0];
    const oldExpenseRaw = expenses.find(e => e.id === id);
    const oldExpense = oldExpenseRaw ? JSON.parse(JSON.stringify(oldExpenseRaw)) : null;
    const result = await updateExpenseRaw(...args);
    if (result && !isSystemExpense(result)) {
      touchSync();
      const cat = result.category === "Ingresos" ? "ingreso" : result.type === "recurrent" ? "plantilla recurrente" : "gasto";
      writeSystemLog("ACTUALIZAR", `Editaste el ${cat} '${result.title}'`, { old: oldExpense, new: result });
    }
    return result;
  }, [updateExpenseRaw, expenses, touchSync, writeSystemLog]);

  const deleteExpense = useCallback(async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    const result = await deleteExpenseRaw(id);
    if (result && expense && !isSystemExpense(expense)) {
      touchSync();
      const cat = expense.category === "Ingresos" ? "ingreso" : expense.type === "recurrent" ? "plantilla recurrente" : "gasto";
      writeSystemLog("ELIMINAR", `Eliminaste un ${cat} llamado '${expense.title}' por ${formatCurrency(expense.amount)}`, expense);
    }
    return result;
  }, [deleteExpenseRaw, expenses, touchSync, writeSystemLog]);

  const toggleExpenseStatus = wrap(toggleExpenseStatusRaw);

  const addDebt = useCallback(async (...args: Parameters<typeof addDebtRaw>) => {
    const result = await addDebtRaw(...args);
    if (result) {
      touchSync();
      writeSystemLog("CREAR", `Registraste una nueva deuda '${result.title}' por ${formatCurrency(result.total_amount)}`, result);
    }
    return result;
  }, [addDebtRaw, touchSync, writeSystemLog]);

  const updateDebt = useCallback(async (id: string, payload: any) => {
    const oldDebtRaw = debts.find(d => d.id === id);
    const oldDebt = oldDebtRaw ? JSON.parse(JSON.stringify(oldDebtRaw)) : null;
    const result = await updateDebtRaw(id, payload);
    if (result) {
      touchSync();
      writeSystemLog("ACTUALIZAR", `Editaste la deuda '${result.title}'`, { old: oldDebt, new: result });
    }
    return result;
  }, [updateDebtRaw, debts, touchSync, writeSystemLog]);

  const deleteDebt = useCallback(async (id: string) => {
    const debt = debts.find(d => d.id === id);
    const result = await deleteDebtRaw(id);
    if (result && debt) {
      touchSync();
      writeSystemLog("ELIMINAR", `Eliminaste la deuda '${debt.title}' de tu historial`, debt);
    }
    return result;
  }, [deleteDebtRaw, debts, touchSync, writeSystemLog]);

  const recordDebtPayment = useCallback(
    async (debtId: string, amount: number) => {
      const debt = debts.find(d => d.id === debtId);
      const ok = await recordDebtPaymentRaw(debtId, amount);
      if (ok && debt) {
        await Promise.all([refetchExpenses(), refetchPayments()]);
        touchSync();
        writeSystemLog("ABONO", `Realizaste un abono de ${formatCurrency(amount)} a la deuda '${debt.title}'`, { debtId, amount });
      }
      return ok;
    },
    [recordDebtPaymentRaw, refetchExpenses, refetchPayments, touchSync, debts, writeSystemLog],
  );

  const undoDebtPayment = useCallback(
    async (paymentId: string) => {
      const payment = debtPayments.find(p => p.id === paymentId);
      const debt = payment ? debts.find(d => d.id === payment?.debt_id) : null;
      const ok = await undoDebtPaymentRaw(paymentId);
      if (ok) {
        await Promise.all([refetchExpenses(), refetchPayments()]);
        touchSync();
        writeSystemLog("REVERTIR ABONO", `Anulaste el abono de ${formatCurrency(payment?.amount || 0)} a la deuda '${debt?.title || "desconocida"}'`, { paymentId, amount: payment?.amount });
      }
      return ok;
    },
    [undoDebtPaymentRaw, refetchExpenses, refetchPayments, touchSync, debtPayments, debts, writeSystemLog],
  );

  const deferDebtMonth = useCallback(
    async (debtId: string, month: number, year: number, observation: string) => {
      const ok = await deferDebtMonthRaw(debtId, month, year, observation);
      if (ok) {
        await refetchExpenses();
        touchSync();
      }
      return ok;
    },
    [deferDebtMonthRaw, refetchExpenses, touchSync],
  );

  const undoDeferDebtMonth = useCallback(
    async (debtId: string, deferExpenseId: string) => {
      const ok = await undoDeferDebtMonthRaw(debtId, deferExpenseId);
      if (ok) {
        await refetchExpenses();
        touchSync();
      }
      return ok;
    },
    [undoDeferDebtMonthRaw, refetchExpenses, touchSync],
  );

  const updateBudgetWrapped = useCallback(
    async (income: number, monthlyBudget: number, savingsGoal: number) => {
      const ok = await updateBudget(income, monthlyBudget, savingsGoal);
      if (ok) touchSync();
      return ok;
    },
    [updateBudget, touchSync],
  );

  const closeMonthWrapped = useCallback(
    async (
      month: number,
      year: number,
      summary: MonthlyFinanceSummary,
      notes?: string,
    ) => {
      const ok = await closeMonth(month, year, summary, notes);
      if (ok) {
        await refetchSnapshots();
        touchSync();
      }
      return ok;
    },
    [closeMonth, refetchSnapshots, touchSync],
  );

  const upsertCategoryLimitWrapped = useCallback(
    async (category: string, monthlyLimit: number) => {
      const ok = await upsertCategoryLimit(category, monthlyLimit);
      if (ok) {
        await refetchCategoryBudgets();
        touchSync();
      }
      return ok;
    },
    [upsertCategoryLimit, refetchCategoryBudgets, touchSync],
  );

  const batchUpsertLimitsWrapped = useCallback(
    async (limits: Record<string, number>) => {
      const ok = await batchUpsertLimits(limits);
      if (ok) touchSync();
      return ok;
    },
    [batchUpsertLimits, touchSync],
  );

  const applySuggestedEnvelopesWrapped = useCallback(
    async (spendablePool: number) => {
      const ok = await applySuggestedEnvelopes(spendablePool);
      if (ok) touchSync();
      return ok;
    },
    [applySuggestedEnvelopes, touchSync],
  );

  const loading =
    budgetLoading ||
    expensesLoading ||
    debtsLoading ||
    paymentsLoading ||
    snapshotsLoading ||
    categoryBudgetsLoading;

  useEffect(() => {
    if (!loading && userId) {
      touchSync();
    }
  }, [loading, userId, touchSync]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const getMonthlySummary = useCallback(
    (month: number, year: number) =>
      computeMonthlySummary(budget, expenses, debts, month, year),
    [budget, expenses, debts],
  );

  const currentMonthSummary = useMemo(
    () => getMonthlySummary(currentMonth, currentYear),
    [getMonthlySummary, currentMonth, currentYear],
  );

  const financialEvents = useMemo(
    () => buildFinancialEvents(expenses, debtPayments, debts),
    [expenses, debtPayments, debts],
  );

  const value = useMemo<FinanceContextType>(
    () => ({
      budget,
      expenses,
      debts,
      debtPayments,
      snapshots,
      categoryBudgets,
      financialEvents,
      loading,
      lastSyncedAt,
      sessionCount,
      connectionState,
      refetchAll,
      getMonthlySummary,
      currentMonthSummary,
      budgetLoading,
      expensesLoading,
      debtsLoading,
      paymentsLoading,
      snapshotsLoading,
      categoryBudgetsLoading,
      updateBudget: updateBudgetWrapped,
      addExpense,
      updateExpense,
      deleteExpense,
      toggleExpenseStatus,
      addDebt,
      updateDebt,
      deleteDebt,
      recordDebtPayment,
      undoDebtPayment,
      deferDebtMonth,
      undoDeferDebtMonth,
      closeMonth: closeMonthWrapped,
      getSnapshot,
      upsertCategoryLimit: upsertCategoryLimitWrapped,
      batchUpsertLimits: batchUpsertLimitsWrapped,
      applySuggestedEnvelopes: applySuggestedEnvelopesWrapped,
    }),
    [
      budget,
      expenses,
      debts,
      debtPayments,
      snapshots,
      categoryBudgets,
      financialEvents,
      loading,
      lastSyncedAt,
      sessionCount,
      connectionState,
      refetchAll,
      getMonthlySummary,
      currentMonthSummary,
      budgetLoading,
      expensesLoading,
      debtsLoading,
      paymentsLoading,
      snapshotsLoading,
      categoryBudgetsLoading,
      updateBudgetWrapped,
      addExpense,
      updateExpense,
      deleteExpense,
      toggleExpenseStatus,
      addDebt,
      updateDebt,
      deleteDebt,
      recordDebtPayment,
      undoDebtPayment,
      deferDebtMonth,
      undoDeferDebtMonth,
      closeMonthWrapped,
      getSnapshot,
      upsertCategoryLimitWrapped,
      batchUpsertLimitsWrapped,
      applySuggestedEnvelopesWrapped,
    ],
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance debe usarse dentro de FinanceProvider");
  }
  return context;
}
