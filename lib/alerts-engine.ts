import type { Debt, Expense, UserBudget, CategoryBudget } from "@/types";
import type { MonthlyFinanceSummary } from "@/lib/finance-calculations";
import { getExpenseDateInMonth } from "@/lib/finance-calculations";
import { spentByCategoryInMonth } from "@/lib/financial-events";

export type AlertSeverity = "critical" | "warning" | "info";

export interface FinanceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  amount?: number;
  dueDate?: Date;
  href?: string;
  kind: "due_overdue" | "due_today" | "due_soon" | "budget" | "cashflow" | "dti" | "category";
}

export function parseDueDate(due: string | null): Date | null {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    const [y, m, d] = due.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(due);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildDueAlerts(
  expenses: Expense[],
  debts: Debt[],
  daysAhead = 14,
): FinanceAlert[] {
  const today = startOfDay(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + daysAhead);
  const alerts: FinanceAlert[] = [];

  const addDue = (
    id: string,
    title: string,
    amount: number,
    due: Date,
    kind: FinanceAlert["kind"],
    href: string,
  ) => {
    const dueDay = startOfDay(due);
    const diff = daysBetween(today, dueDay);
    let severity: AlertSeverity = "info";
    let alertKind = kind;

    if (diff < 0) {
      severity = "critical";
      alertKind = "due_overdue";
    } else if (diff === 0) {
      severity = "warning";
      alertKind = "due_today";
    } else if (diff <= 7) {
      severity = "warning";
      alertKind = "due_soon";
    }

    alerts.push({
      id: `${alertKind}-${id}`,
      severity,
      title,
      message:
        diff < 0
          ? `Venció hace ${Math.abs(diff)} día(s)`
          : diff === 0
            ? "Vence hoy"
            : `Vence en ${diff} día(s)`,
      amount,
      dueDate: due,
      href,
      kind: alertKind,
    });
  };

  for (const e of expenses) {
    if (e.status === "paid") continue;
    const due = parseDueDate(e.due_date);
    if (!due) continue;
    const dueDay = startOfDay(due);
    if (dueDay > limit) continue;
    addDue(e.id, e.title, e.amount, due, "due_soon", "/schedule");
  }

  for (const d of debts) {
    if (d.remaining_amount <= 0) continue;
    const originalDue = parseDueDate(d.due_date);
    if (!originalDue) continue;
    
    const day = originalDue.getDate();
    
    const isCoveredThisMonth = expenses.some((e) => {
      if (e.status !== "paid") return false;
      const isPayment = e.title.toLowerCase().startsWith(`abono a deuda: ${d.title.toLowerCase()}`);
      const isDefer = e.title === `DEFER_DEBT:${d.id}` || e.title.startsWith(`DEFER_DEBT:${d.id}::`);
      if (!isPayment && !isDefer) return false;
      return getExpenseDateInMonth(e, today.getMonth() + 1, today.getFullYear());
    });

    let targetDue = new Date(today.getFullYear(), today.getMonth(), day);
    
    if (isCoveredThisMonth) {
      targetDue = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }

    const dueDay = startOfDay(targetDue);
    if (dueDay > limit) continue;

    addDue(
      d.id,
      `Cuota: ${d.title}`,
      d.minimum_payment,
      targetDue,
      "due_soon",
      "/debts",
    );
  }

  return alerts.sort((a, b) => {
    const ta = a.dueDate?.getTime() ?? 0;
    const tb = b.dueDate?.getTime() ?? 0;
    return ta - tb;
  });
}

export function buildSmartAlerts(
  expenses: Expense[],
  debts: Debt[],
  budget: UserBudget | null,
  summary: MonthlyFinanceSummary,
  categoryBudgets: CategoryBudget[],
  month: number,
  year: number,
): FinanceAlert[] {
  const due = buildDueAlerts(expenses, debts, 14);
  const extra: FinanceAlert[] = [];

  if (summary.realAvailableCash < 0) {
    extra.push({
      id: "cashflow-deficit",
      severity: "critical",
      title: "Flujo negativo del mes",
      message: `Tu disponible real es negativo. Revisa gastos variables o ingresos extra.`,
      amount: Math.abs(summary.realAvailableCash),
      href: "/expenses",
      kind: "cashflow",
    });
  }

  if (summary.dtiRatio > 36) {
    extra.push({
      id: "dti-critical",
      severity: "critical",
      title: "DTI crítico",
      message: `Destinas ${summary.dtiRatio.toFixed(0)}% del ingreso a cuotas mínimas de deuda.`,
      href: "/advisor",
      kind: "dti",
    });
  } else if (summary.dtiRatio >= 20) {
    extra.push({
      id: "dti-warning",
      severity: "warning",
      title: "DTI moderado",
      message: `El ${summary.dtiRatio.toFixed(0)}% de tus ingresos va a deudas. Considera abonos extra.`,
      href: "/advisor",
      kind: "dti",
    });
  }

  const budgetLimit = budget?.monthly_budget ?? 0;
  if (budgetLimit > 0 && summary.monthSpent > budgetLimit) {
    extra.push({
      id: "budget-over",
      severity: "warning",
      title: "Presupuesto mensual superado",
      message: `Has gastado más que tu tope configurado (${summary.monthSpent > budgetLimit ? "exceso" : ""}).`,
      amount: summary.monthSpent - budgetLimit,
      href: "/settings",
      kind: "budget",
    });
  }

  const spentByCat = spentByCategoryInMonth(expenses, month, year);
  for (const cb of categoryBudgets) {
    if (cb.monthly_limit <= 0) continue;
    const used = spentByCat[cb.category] ?? 0;
    if (used > cb.monthly_limit) {
      extra.push({
        id: `cat-over-${cb.category}`,
        severity: "warning",
        title: `Sobre tope: ${cb.category}`,
        message: `Gastaste de más en esta categoría respecto a tu sobre mensual.`,
        amount: used - cb.monthly_limit,
        href: "/budgets",
        kind: "category",
      });
    }
  }

  const now = new Date();
  if (month === now.getMonth() + 1 && year === now.getFullYear() && budgetLimit > 0) {
    const day = now.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyAvg = day > 0 ? summary.monthSpent / day : 0;
    if (dailyAvg > 0 && summary.monthSpent < budgetLimit) {
      const daysUntilEmpty = Math.floor((budgetLimit - summary.monthSpent) / dailyAvg);
      if (daysUntilEmpty <= 7 && daysUntilEmpty >= 0) {
        extra.push({
          id: "budget-pace",
          severity: "info",
          title: "Ritmo de gasto elevado",
          message: `Al ritmo actual, tu presupuesto se agotaría en ~${daysUntilEmpty} día(s) (quedan ${daysInMonth - day} del mes).`,
          href: "/expenses",
          kind: "budget",
        });
      }
    }
  }

  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return [...due, ...extra].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

export function countAlertsBySeverity(alerts: FinanceAlert[]) {
  return {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
    total: alerts.length,
  };
}
