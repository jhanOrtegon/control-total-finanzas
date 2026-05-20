import type {
  CategoryBudget,
  Debt,
  DebtPayment,
  Expense,
  MonthlySnapshot,
  UserBudget,
} from "@/types";
import type { MonthlyFinanceSummary } from "@/lib/finance-calculations";
import {
  analyzePoolBalance,
  buildEnvelopeRows,
  computeEnvelopeTotals,
  getSpendablePool,
} from "@/lib/envelope-calculations";
import {
  buildFinancialEvents,
  filterEvents,
  spentByCategoryInMonth,
} from "@/lib/financial-events";
import {
  buildSmartAlerts,
  countAlertsBySeverity,
  type FinanceAlert,
} from "@/lib/alerts-engine";
import {
  compareToPreviousSnapshot,
  getPreviousPeriod,
  type PeriodDelta,
} from "@/lib/snapshot-comparison";
export interface CategoryReportRow {
  category: string;
  spent: number;
  limit: number;
  remaining: number;
  pctUsed: number;
  over: boolean;
}

export interface MonthlyDetailReport {
  month: number;
  year: number;
  periodLabel: string;
  summary: MonthlyFinanceSummary;
  comparison: PeriodDelta[];
  categoryRows: CategoryReportRow[];
  poolAnalysis: ReturnType<typeof analyzePoolBalance>;
  spendablePool: number;
  envelopeTotals: ReturnType<typeof computeEnvelopeTotals>;
  topMovements: ReturnType<typeof buildFinancialEvents>;
  movementTotals: {
    expenses: number;
    income: number;
    debtPayments: number;
    netFlow: number;
  };
  debtOverview: {
    count: number;
    outstanding: number;
    minimums: number;
    paidOff: number;
  };
  alerts: FinanceAlert[];
  alertCounts: ReturnType<typeof countAlertsBySeverity>;
  isMonthClosed: boolean;
  snapshotNotes: string | null;
  recommendations: string[];
}

export function buildMonthlyDetailReport(
  month: number,
  year: number,
  periodLabel: string,
  budget: UserBudget | null,
  expenses: Expense[],
  debts: Debt[],
  debtPayments: DebtPayment[],
  categoryBudgets: CategoryBudget[],
  snapshots: MonthlySnapshot[],
  summary: MonthlyFinanceSummary,
): MonthlyDetailReport {
  const spentByCat = spentByCategoryInMonth(expenses, month, year);
  const rows = buildEnvelopeRows(categoryBudgets, spentByCat);
  const income = budget?.monthly_income ?? summary.baseIncome;
  const savingsGoal = budget?.monthly_savings_goal ?? summary.savingsGoal;
  const monthlyBudget = budget?.monthly_budget ?? 0;
  const spendablePool = getSpendablePool(income, monthlyBudget, savingsGoal);
  const envelopeTotals = computeEnvelopeTotals(rows, spendablePool);
  const poolAnalysis = analyzePoolBalance(
    spendablePool,
    envelopeTotals.totalLimits,
    envelopeTotals.totalSpent,
  );

  const prev = getPreviousPeriod(month, year);
  const prevSnap = snapshots.find(
    (s) => s.year === prev.year && s.month === prev.month,
  );
  const comparison = compareToPreviousSnapshot(summary, prevSnap ?? null);

  const events = filterEvents(
    buildFinancialEvents(expenses, debtPayments, debts),
    { month, year },
  );

  const movementTotals = {
    expenses: events
      .filter((e) => e.type === "expense")
      .reduce((a, e) => a + e.amount, 0),
    income: events
      .filter((e) => e.type === "income")
      .reduce((a, e) => a + e.amount, 0),
    debtPayments: events
      .filter((e) => e.type === "debt_payment")
      .reduce((a, e) => a + e.amount, 0),
    netFlow: 0,
  };
  movementTotals.netFlow =
    movementTotals.income -
    movementTotals.expenses -
    movementTotals.debtPayments;

  const topMovements = [...events]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const alerts = buildSmartAlerts(
    expenses,
    debts,
    budget,
    summary,
    categoryBudgets,
    month,
    year,
  );

  const snap = snapshots.find((s) => s.year === year && s.month === month);

  const recommendations: string[] = [];
  if (summary.realAvailableCash < 0) {
    recommendations.push(
      "Cierra el mes con déficit: revisa gastos variables o busca ingresos extra.",
    );
  }
  if (poolAnalysis.status === "over_allocated") {
    recommendations.push(poolAnalysis.message);
  }
  if (envelopeTotals.overBudgetCategories > 0) {
    recommendations.push(
      `${envelopeTotals.overBudgetCategories} categoría(s) superaron su sobre. Ajusta en Presupuesto por categoría.`,
    );
  }
  if (summary.pendingObligationsCount > 0) {
    recommendations.push(
      `Tienes ${summary.pendingObligationsCount} obligación(es) pendiente(s) en el cronograma.`,
    );
  }
  if (summary.dtiRatio > 40) {
    recommendations.push(
      "DTI elevado: prioriza abonos extra o renegociación de deudas.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Mes estable. Considera cerrar el periodo en Evolución y Cierre para guardar el snapshot.",
    );
  }

  return {
    month,
    year,
    periodLabel,
    summary,
    comparison,
    categoryRows: rows.map((r) => ({
      category: r.category,
      spent: r.spent,
      limit: r.limit,
      remaining: r.remaining,
      pctUsed: r.pctUsed,
      over: r.over,
    })),
    poolAnalysis,
    spendablePool,
    envelopeTotals,
    topMovements,
    movementTotals,
    debtOverview: {
      count: debts.length,
      outstanding: summary.totalOutstandingDebt,
      minimums: summary.monthlyDebtMinimums,
      paidOff: summary.totalPaidOffDebt,
    },
    alerts,
    alertCounts: countAlertsBySeverity(alerts),
    isMonthClosed: Boolean(snap),
    snapshotNotes: snap?.notes ?? null,
    recommendations,
  };
}

export function reportToCsv(report: MonthlyDetailReport): string {
  const lines: string[] = [
    "Informe mensual Libertad Financiera",
    `Periodo,${report.periodLabel}`,
    "",
    "Métrica,Valor",
    `Ingresos,${report.summary.totalIncome}`,
    `Gastos,${report.summary.monthSpent}`,
    `Disponible real,${report.summary.realAvailableCash}`,
    `DTI %,${report.summary.dtiRatio.toFixed(1)}`,
    `Deuda pendiente,${report.debtOverview.outstanding}`,
    `Pool gastable,${report.spendablePool}`,
    `Sobres asignados,${report.envelopeTotals.totalLimits}`,
    `Estado pool,${report.poolAnalysis.status}`,
    "",
    "Categoría,Gastado,Tope,% usado,Sobrepasado",
  ];

  for (const row of report.categoryRows.filter((r) => r.spent > 0 || r.limit > 0)) {
    lines.push(
      `${row.category},${row.spent},${row.limit},${row.pctUsed.toFixed(1)},${row.over ? "Sí" : "No"}`,
    );
  }

  lines.push("", "Recomendaciones");
  report.recommendations.forEach((r, i) => lines.push(`${i + 1},"${r.replace(/"/g, '""')}"`));

  return lines.join("\n");
}
