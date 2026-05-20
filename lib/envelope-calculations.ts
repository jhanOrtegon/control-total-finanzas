import type { CategoryBudget, Expense } from "@/types";
import { CATEGORIES_LIST } from "@/lib/constants";
import { spentByCategoryInMonth } from "@/lib/financial-events";
import { getPreviousPeriod } from "@/lib/snapshot-comparison";

/** Pesos relativos para repartir el presupuesto variable (suman 1). */
export const ENVELOPE_WEIGHTS: Record<string, number> = {
  Vivienda: 0.28,
  Servicios: 0.12,
  Comida: 0.18,
  Transporte: 0.12,
  Entretenimiento: 0.1,
  Compras: 0.1,
  Otros: 0.1,
};

export const SPEND_CATEGORIES = CATEGORIES_LIST.filter((c) => c.name !== "Ingresos").map(
  (c) => c.name,
);

export interface EnvelopeRow {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pctUsed: number;
  over: boolean;
  unconfigured: boolean;
}

export interface EnvelopeTotals {
  income: number;
  spendablePool: number;
  totalLimits: number;
  totalSpent: number;
  unallocated: number;
  overBudgetCategories: number;
}

export function getSpendablePool(
  monthlyIncome: number,
  monthlyBudget: number,
  savingsGoal: number,
): number {
  if (monthlyBudget > 0) return Math.max(0, monthlyBudget);
  return Math.max(0, monthlyIncome - savingsGoal);
}

export function suggestEnvelopeLimits(
  spendablePool: number,
  weights: Record<string, number> = ENVELOPE_WEIGHTS,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const cat of SPEND_CATEGORIES) {
    const w = weights[cat] ?? 0;
    result[cat] = Math.round(spendablePool * w);
  }
  return result;
}

export function buildEnvelopeRows(
  categoryBudgets: CategoryBudget[],
  spentByCategory: Record<string, number>,
): EnvelopeRow[] {
  return SPEND_CATEGORIES.map((category) => {
    const row = categoryBudgets.find((c) => c.category === category);
    const limit = row?.monthly_limit ?? 0;
    const spent = spentByCategory[category] ?? 0;
    const remaining = limit > 0 ? limit - spent : 0;
    const pctUsed = limit > 0 ? (spent / limit) * 100 : 0;
    return {
      category,
      limit,
      spent,
      remaining,
      pctUsed,
      over: limit > 0 && spent > limit,
      unconfigured: limit <= 0,
    };
  });
}

export function computeEnvelopeTotals(
  rows: EnvelopeRow[],
  spendablePool: number,
): Pick<EnvelopeTotals, "totalLimits" | "totalSpent" | "unallocated" | "overBudgetCategories"> {
  const totalLimits = rows.reduce((a, r) => a + r.limit, 0);
  const totalSpent = rows.reduce((a, r) => a + r.spent, 0);
  return {
    totalLimits,
    totalSpent,
    unallocated: Math.max(0, spendablePool - totalLimits),
    overBudgetCategories: rows.filter((r) => r.over).length,
  };
}

export type PoolBalanceStatus =
  | "no_pool"
  | "balanced"
  | "under_allocated"
  | "over_allocated";

export interface PoolBalanceAnalysis {
  spendablePool: number;
  totalLimits: number;
  totalSpent: number;
  difference: number;
  status: PoolBalanceStatus;
  message: string;
  severity: "ok" | "warning" | "critical";
}

export function analyzePoolBalance(
  spendablePool: number,
  totalLimits: number,
  totalSpent = 0,
  tolerancePct = 2,
): PoolBalanceAnalysis {
  if (spendablePool <= 0) {
    return {
      spendablePool: 0,
      totalLimits,
      totalSpent,
      difference: 0,
      status: "no_pool",
      severity: "warning",
      message:
        "Configura presupuesto mensual o ingreso en Ajustes para enlazar sobres con un pool.",
    };
  }

  const difference = spendablePool - totalLimits;
  const tolerance = spendablePool * (tolerancePct / 100);

  if (Math.abs(difference) <= tolerance) {
    return {
      spendablePool,
      totalLimits,
      totalSpent,
      difference,
      status: "balanced",
      severity: "ok",
      message: `Los sobres cuadran con tu pool (${formatShort(spendablePool)}).`,
    };
  }

  if (difference > tolerance) {
    return {
      spendablePool,
      totalLimits,
      totalSpent,
      difference,
      status: "under_allocated",
      severity: "warning",
      message: `Te sobran ${formatShort(difference)} sin asignar a categorías. Puedes redistribuirlos o ahorrarlos.`,
    };
  }

  return {
    spendablePool,
    totalLimits,
    totalSpent,
    difference,
    status: "over_allocated",
    severity: "critical",
    message: `Los sobres superan el pool por ${formatShort(Math.abs(difference))}. Ajusta límites o sube el presupuesto en Ajustes.`,
  };
}

function formatShort(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Límites basados en lo gastado en un mes (útil para copiar del mes anterior). */
export function limitsFromMonthSpending(
  expenses: Expense[],
  month: number,
  year: number,
  options?: { bufferPct?: number; minFloor?: number },
): Record<string, number> {
  const spent = spentByCategoryInMonth(expenses, month, year);
  const buffer = 1 + (options?.bufferPct ?? 0) / 100;
  const minFloor = options?.minFloor ?? 0;
  const result: Record<string, number> = {};
  for (const cat of SPEND_CATEGORIES) {
    const base = spent[cat] ?? 0;
    result[cat] = base > 0 ? Math.round(base * buffer) : minFloor;
  }
  return result;
}

export function getCopyFromPreviousMonthSource(month: number, year: number) {
  return getPreviousPeriod(month, year);
}

export function getCategoryEnvelopeStatus(
  category: string,
  categoryBudgets: CategoryBudget[],
  expenses: Parameters<typeof spentByCategoryInMonth>[0],
  month: number,
  year: number,
  additionalAmount = 0,
) {
  if (category === "Ingresos") return null;
  const spent = spentByCategoryInMonth(expenses, month, year);
  const limit =
    categoryBudgets.find((c) => c.category === category)?.monthly_limit ?? 0;
  if (limit <= 0) return { limit: 0, spent: spent[category] ?? 0, remaining: null, wouldExceed: false };

  const used = (spent[category] ?? 0) + additionalAmount;
  const remaining = limit - used;
  return {
    limit,
    spent: spent[category] ?? 0,
    remaining,
    wouldExceed: used > limit,
    pctAfter: (used / limit) * 100,
  };
}
