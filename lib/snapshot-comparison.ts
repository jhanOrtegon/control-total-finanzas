import type { MonthlySnapshot } from "@/types";
import type { MonthlyFinanceSummary } from "@/lib/finance-calculations";

export interface PeriodDelta {
  key: string;
  label: string;
  current: number;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
  /** true = subir es bueno (ingresos, disponible) */
  higherIsBetter: boolean;
}

export function getPreviousPeriod(month: number, year: number) {
  const d = new Date(year, month - 2, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function isDbSnapshot(
  snap: MonthlySnapshot | MonthlyFinanceSummary,
): snap is MonthlySnapshot {
  return "total_income" in snap;
}

export function snapshotToMetrics(
  snap: MonthlySnapshot | MonthlyFinanceSummary,
): Record<string, number> {
  if (isDbSnapshot(snap)) {
    return {
      total_income: snap.total_income,
      total_spent: snap.total_spent,
      real_available_cash: snap.real_available_cash,
      total_outstanding_debt: snap.total_outstanding_debt,
      dti_ratio: snap.dti_ratio,
      savings_goal: snap.savings_goal,
    };
  }
  return {
    total_income: snap.totalIncome,
    total_spent: snap.monthSpent,
    real_available_cash: snap.realAvailableCash,
    total_outstanding_debt: snap.totalOutstandingDebt,
    dti_ratio: snap.dtiRatio,
    savings_goal: snap.savingsGoal,
  };
}

const METRIC_META: {
  key: string;
  label: string;
  higherIsBetter: boolean;
}[] = [
  { key: "total_income", label: "Ingresos", higherIsBetter: true },
  { key: "total_spent", label: "Gastos", higherIsBetter: false },
  { key: "real_available_cash", label: "Disponible real", higherIsBetter: true },
  { key: "total_outstanding_debt", label: "Deuda restante", higherIsBetter: false },
  { key: "dti_ratio", label: "DTI (%)", higherIsBetter: false },
];

export function compareToPreviousSnapshot(
  current: MonthlyFinanceSummary | MonthlySnapshot,
  previous: MonthlySnapshot | null,
): PeriodDelta[] {
  const cur = snapshotToMetrics(current);
  const prev = previous ? snapshotToMetrics(previous) : null;

  return METRIC_META.map(({ key, label, higherIsBetter }) => {
    const currentVal = cur[key] ?? 0;
    const previousVal = prev ? prev[key] ?? 0 : null;
    const delta =
      previousVal != null ? currentVal - previousVal : null;
    const deltaPct =
      previousVal != null && previousVal !== 0
        ? (delta! / Math.abs(previousVal)) * 100
        : null;

    return {
      key,
      label,
      current: currentVal,
      previous: previousVal,
      delta,
      deltaPct,
      higherIsBetter,
    };
  });
}

export function isDeltaPositive(delta: PeriodDelta): boolean | null {
  if (delta.delta == null) return null;
  if (delta.delta === 0) return true;
  return delta.higherIsBetter ? delta.delta > 0 : delta.delta < 0;
}
