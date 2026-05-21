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
      toast.info(`📡 ${desc} ${action}`, {
        description: "Cambio sincronizado desde otra sesión",
        duration: 3000,
      });
      touchSync();
    },
  });

  // Push notifications setup
  useEffect(() => {
    registerServiceWorker();
    requestNotificationPermission();
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

  // addExpense with budget threshold warning
  const addExpense = useCallback(
    async (payload: Parameters<typeof addExpenseRaw>[0]) => {
      const result = await addExpenseRaw(payload);
      if (result && budget) {
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
    [addExpenseRaw, budget, expenses, categoryBudgets, touchSync],
  );

  const updateExpense = wrap(updateExpenseRaw);
  const deleteExpense = wrap(deleteExpenseRaw);
  const toggleExpenseStatus = wrap(toggleExpenseStatusRaw);
  const addDebt = wrap(addDebtRaw);
  const updateDebt = wrap(updateDebtRaw);
  const deleteDebt = wrap(deleteDebtRaw);

  const recordDebtPayment = useCallback(
    async (debtId: string, amount: number) => {
      const ok = await recordDebtPaymentRaw(debtId, amount);
      if (ok) {
        await Promise.all([refetchExpenses(), refetchPayments()]);
        touchSync();
      }
      return ok;
    },
    [recordDebtPaymentRaw, refetchExpenses, refetchPayments, touchSync],
  );

  const undoDebtPayment = useCallback(
    async (paymentId: string) => {
      const ok = await undoDebtPaymentRaw(paymentId);
      if (ok) {
        await Promise.all([refetchExpenses(), refetchPayments()]);
        touchSync();
      }
      return ok;
    },
    [undoDebtPaymentRaw, refetchExpenses, refetchPayments, touchSync],
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
