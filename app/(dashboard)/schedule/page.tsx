"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useFinance } from "@/providers/finance-provider";
import { isDateInMonth, isDebtApplicableToMonth, getExpenseDateInMonth, isDeferDebtExpense, getUserProfileConfig, getYearlyIncome, isSystemExpense } from "@/lib/finance-calculations";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { getCategoryEmoji, getCategoryColor } from "@/lib/constants";
import { PlanModal } from "@/components/schedule/plan-modal";
import { MonthCloseWizard } from "@/components/month-close/month-close-wizard";
import { DeferDebtDialog } from "@/components/schedule/defer-debt-dialog";
import { Pagination } from "@/components/shared/pagination";
import { useConfirm } from "@/providers/confirm-provider";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Debt } from "@/types";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Coins,
  Sparkles,
  Info,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TodayUrgentPanel } from "@/components/schedule/today-urgent-panel";

const MONTHS = [
  { name: "Ene", fullName: "Enero" },
  { name: "Feb", fullName: "Febrero" },
  { name: "Mar", fullName: "Marzo" },
  { name: "Abr", fullName: "Abril" },
  { name: "May", fullName: "Mayo" },
  { name: "Jun", fullName: "Junio" },
  { name: "Jul", fullName: "Julio" },
  { name: "Ago", fullName: "Agosto" },
  { name: "Sep", fullName: "Septiembre" },
  { name: "Oct", fullName: "Octubre" },
  { name: "Nov", fullName: "Noviembre" },
  { name: "Dic", fullName: "Diciembre" },
];

const PERCENT_BUCKETS = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
];
const HEIGHT_CLASSES = [
  "h-0",
  "h-[5%]",
  "h-[10%]",
  "h-[15%]",
  "h-[20%]",
  "h-[25%]",
  "h-[30%]",
  "h-[35%]",
  "h-[40%]",
  "h-[45%]",
  "h-[50%]",
  "h-[55%]",
  "h-[60%]",
  "h-[65%]",
  "h-[70%]",
  "h-[75%]",
  "h-[80%]",
  "h-[85%]",
  "h-[90%]",
  "h-[95%]",
  "h-[100%]",
];

function percentToHeightClass(percent: number) {
  const bounded = Math.max(0, Math.min(100, percent));
  let nearestIndex = 0;
  let minDiff = Number.POSITIVE_INFINITY;

  PERCENT_BUCKETS.forEach((bucket, idx) => {
    const diff = Math.abs(bucket - bounded);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIndex = idx;
    }
  });

  return HEIGHT_CLASSES[nearestIndex];
}



export default function SchedulePage() {
  const { theme } = useTheme();
  const {
    expenses,
    debtPayments,
    addExpense,
    deleteExpense,
    updateExpense,
    debts,
    recordDebtPayment,
    undoDebtPayment,
    deferDebtMonth,
    undoDeferDebtMonth,
    budget,
  } = useFinance();

  // States
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  ); // 1-12
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [obligationsPage, setObligationsPage] = useState(1);
  const [scheduleTab, setScheduleTab] = useState<"pending" | "paid">("pending");
  const confirm = useConfirm();
  const [deferTargetObligation, setDeferTargetObligation] = useState<any | null>(null);
  const [deferDialogOpen, setDeferDialogOpen] = useState(false);

  const OBLIGATIONS_PER_PAGE = 6;

  // Compile monthly statistics
  const getMonthlyStats = (monthNum: number) => {
    const allRecurrentTemplates = expenses.filter((e) => e.type === "recurrent");
    const recurrentTemplates = allRecurrentTemplates;

    // 1. Paid recurrent entries
    const paidRecurrents = expenses.filter(
      (e) =>
        e.type === "one-time" &&
        e.status === "paid" &&
        isDateInMonth(e.paid_date || e.due_date, monthNum, selectedYear) &&
        allRecurrentTemplates.some(
          (temp) => temp.title.toLowerCase() === e.title.toLowerCase(),
        ),
    );

    // 2. Custom month specific incomes
    const customIncomes = expenses.filter(
      (e) =>
        e.type === "one-time" &&
        e.category === "Ingresos" &&
        !isSystemExpense(e) &&
        isDateInMonth(
          e.status === "paid" ? e.paid_date : e.due_date,
          monthNum,
          selectedYear,
        ),
    );

    // 3. One-time expenses (excluding recurrent templates, debt payments, and incomes)
    const oneTimeExpenses = expenses.filter(
      (e) =>
        e.type === "one-time" &&
        e.category !== "Ingresos" &&
        !isSystemExpense(e) &&
        isDateInMonth(
          e.status === "paid" ? e.paid_date : e.due_date,
          monthNum,
          selectedYear,
        ) &&
        !allRecurrentTemplates.some(
          (temp) => temp.title.toLowerCase() === e.title.toLowerCase(),
        ) &&
        !e.title.toLowerCase().startsWith("abono a deuda:") &&
        !isDeferDebtExpense(e),
    );

    // 4. Debt minimum payments
    const activeDebts = debts.filter((d) =>
      isDebtApplicableToMonth(d, monthNum, selectedYear, expenses),
    );

    // Mappings
    const recurrentObligations = recurrentTemplates.map((temp) => ({
      id: temp.id,
      title: temp.title,
      amount: temp.amount,
      category: temp.category,
      isRecurrentTemplate: true,
      isPaid: paidRecurrents.some(
        (p) => p.title.toLowerCase() === temp.title.toLowerCase(),
      ),
    }));

    const oneTimeObligations = oneTimeExpenses.map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      category: e.category,
      isOneTime: true,
      isPaid: e.status === "paid",
      dueDate: e.due_date,
    }));

    const debtObligations = activeDebts.map((d) => {
      const deferExpense = expenses.find(
        (e) => (e.title === `DEFER_DEBT:${d.id}` || e.title.startsWith(`DEFER_DEBT:${d.id}::`)) && e.status === "paid" && getExpenseDateInMonth(e, monthNum, selectedYear)
      );
      
      const monthDebtPayments = debtPayments.filter(
        (p) =>
          p.debt_id === d.id &&
          isDateInMonth(p.paid_at, monthNum, selectedYear),
      );
      const amountPaid = monthDebtPayments.reduce(
        (acc, p) => acc + p.amount,
        0,
      );
      const latestPayment = monthDebtPayments[0] ?? null;
      return {
        id: d.id,
        title: `Pago Mínimo: ${d.title}`,
        amount: d.minimum_payment,
        category: "Otros",
        isDebt: true,
        isDeferred: !!deferExpense,
        deferReason: deferExpense ? deferExpense.title.split("::")[1] || "Sin observación" : null,
        deferExpenseId: deferExpense?.id || null,
        isPaid: amountPaid >= d.minimum_payment || !!deferExpense,
        amountPaid,
        debtId: d.id,
        latestPaymentId: latestPayment?.id ?? null,
      };
    });

    const incomeObligations = customIncomes.map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      category: "Ingresos",
      isIncome: true,
      isPaid: true,
    }));

    const totalDue =
      recurrentObligations.reduce((a, c) => a + c.amount, 0) +
      oneTimeObligations.reduce((a, c) => a + c.amount, 0) +
      debtObligations.filter(d => !d.isDeferred).reduce((a, c) => a + c.amount, 0);

    const totalPaid =
      recurrentObligations.reduce((a, c) => a + (c.isPaid ? c.amount : 0), 0) +
      oneTimeObligations.reduce((a, c) => a + (c.isPaid ? c.amount : 0), 0) +
      debtObligations.filter(d => !d.isDeferred).reduce(
        (a, c) => a + (c.isPaid ? c.amount : c.amountPaid),
        0,
      );

    const profile = getUserProfileConfig(expenses);
    const baseIncome = getYearlyIncome(expenses, selectedYear, budget?.monthly_income || 0);
    
    let primasIncome = 0;
    if (
      (monthNum === 6 || monthNum === 12) &&
      profile.profileType === "empleado" &&
      (profile.contractType === "indefinido" || profile.contractType === "fijo")
    ) {
      const fullYearlyIncome = getYearlyIncome(expenses, selectedYear, budget?.monthly_income || 0);
      primasIncome = fullYearlyIncome / 2;
    }

    const extraIncome = incomeObligations.reduce((a, c) => a + c.amount, 0);

    return {
      allObligations: [
        ...incomeObligations,
        ...recurrentObligations,
        ...oneTimeObligations,
        ...debtObligations,
      ],
      totalDue,
      totalPaid,
      totalPending: Math.max(0, totalDue - totalPaid),
      totalIncome: baseIncome + extraIncome + primasIncome,
      primasIncome,
    };
  };

  // Compile stats for current year
  const yearlyChartData = MONTHS.map((m, idx) => {
    const stats = getMonthlyStats(idx + 1);
    return {
      monthLabel: m.name,
      monthNum: idx + 1,
      totalDue: stats.totalDue,
      totalPaid: stats.totalPaid,
    };
  });

  const maxYearlyDue = Math.max(...yearlyChartData.map((d) => d.totalDue), 100);
  const selectedStats = getMonthlyStats(selectedMonth);
  const projectedPaymentsFlow = selectedStats.totalDue;
  const realPaymentsFlow = selectedStats.totalPaid;
  const programmedSavings = budget?.monthly_savings_goal || 0;
  const projectedAvailableAfterPayments =
    selectedStats.totalIncome - projectedPaymentsFlow - programmedSavings;
  const realAvailableAfterPayments =
    selectedStats.totalIncome - realPaymentsFlow - programmedSavings;
  const filteredObligations = useMemo(
    () =>
      selectedStats.allObligations.filter((ob) =>
        scheduleTab === "paid" ? ob.isPaid : !ob.isPaid && !("isIncome" in ob),
      ),
    [selectedStats.allObligations, scheduleTab],
  );
  const totalObligationPages = Math.max(
    1,
    Math.ceil(filteredObligations.length / OBLIGATIONS_PER_PAGE),
  );
  const paginatedObligations = filteredObligations.slice(
    (obligationsPage - 1) * OBLIGATIONS_PER_PAGE,
    obligationsPage * OBLIGATIONS_PER_PAGE,
  );

  useEffect(() => {
    setObligationsPage(1);
  }, [selectedMonth, selectedYear, scheduleTab]);

  useEffect(() => {
    if (obligationsPage > totalObligationPages) {
      setObligationsPage(totalObligationPages);
    }
  }, [obligationsPage, totalObligationPages]);

  // Handlers
  const handleToggleRecurrent = async (ob: {
    title: string;
    amount: number;
    category: string;
    isPaid: boolean;
  }) => {
    if (ob.isPaid) {
      const instance = expenses.find(
        (e) =>
          e.type === "one-time" &&
          e.status === "paid" &&
          isDateInMonth(
            e.paid_date || e.due_date,
            selectedMonth,
            selectedYear,
          ) &&
          e.title.toLowerCase() === ob.title.toLowerCase(),
      );
      if (instance) await deleteExpense(instance.id);
    } else {
      const pad = selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth;
      await addExpense({
        title: ob.title,
        amount: ob.amount,
        category: ob.category,
        type: "one-time",
        status: "paid",
        due_date: `${selectedYear}-${pad}-15`,
      });
    }
  };

  const handleToggleOneTime = async (ob: { id: string; isPaid: boolean; dueDate?: string | null }) => {
    const pad = selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth;
    const fallbackDate = `${selectedYear}-${pad}-15`;
    const pd = ob.isPaid ? null : (ob.dueDate || fallbackDate);
    await updateExpense(ob.id, { status: ob.isPaid ? "pending" : "paid", paid_date: pd });
  };

  const handleDeferOneTime = async (ob: any) => {
    const ok = await confirm({
      title: "Aplazar Gasto",
      description: "¿Quieres aplazar este pago para el mes siguiente?",
      confirmLabel: "Sí, aplazar",
      variant: "default",
    });
    if (!ok) return;
    
    const currentDueDate = new Date(ob.dueDate || new Date().toISOString());
    currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    const nextMonthDate = currentDueDate.toISOString().slice(0, 10);
    
    await updateExpense(ob.id, { due_date: nextMonthDate });
    toast.success("Pago aplazado correctamente");
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar transacción",
      description: "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (ok) await deleteExpense(id);
  };

  const handlePayAll = async () => {
    const pendingObs = selectedStats.allObligations.filter((ob) => !ob.isPaid && !("isIncome" in ob));
    if (pendingObs.length === 0) return;

    const ok = await confirm({
      title: "Pagar todo el mes",
      description: `¿Estás seguro de marcar las ${pendingObs.length} obligaciones pendientes como pagadas?`,
      confirmLabel: "Sí, pagar todo",
      variant: "default",
    });

    if (!ok) return;

    const toastId = toast.loading("Procesando pagos...");
    
    for (const ob of pendingObs) {
      if ("isRecurrentTemplate" in ob) {
        await handleToggleRecurrent(ob as any);
      } else if ("isOneTime" in ob) {
        await handleToggleOneTime(ob as any);
      } else if ("isDebt" in ob) {
        await recordDebtPayment(ob.id, ob.amount);
      }
    }

    toast.success("Todas las obligaciones han sido pagadas.", { id: toastId });
  };

  const handleRevertAll = async () => {
    const paidObs = selectedStats.allObligations.filter((ob) => ob.isPaid && !("isIncome" in ob));
    if (paidObs.length === 0) return;

    const ok = await confirm({
      title: "Revertir pagos",
      description: `¿Estás seguro de deshacer el pago de las ${paidObs.length} obligaciones marcadas como pagadas?`,
      confirmLabel: "Sí, revertir todo",
      variant: "danger",
    });

    if (!ok) return;

    const toastId = toast.loading("Revirtiendo pagos...");

    for (const ob of paidObs) {
      if ("isRecurrentTemplate" in ob) {
        await handleToggleRecurrent(ob as any);
      } else if ("isOneTime" in ob) {
        await handleToggleOneTime(ob as any);
      } else if ("isDebt" in ob && "isDeferred" in ob) {
        if (ob.isDeferred && ob.deferExpenseId) {
          await undoDeferDebtMonth(ob.id, ob.deferExpenseId);
        } else if ("latestPaymentId" in ob && ob.latestPaymentId) {
          await undoDebtPayment(ob.latestPaymentId);
        }
      }
    }

    toast.success("Se han revertido los pagos del mes.", { id: toastId });
  };

  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebtId || paymentAmount === "") return;
    const amount = paymentAmount as number;
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingresa un monto de abono válido.");
      return;
    }
    const success = await recordDebtPayment(payingDebtId, amount);
    if (success) {
      setPayingDebtId(null);
      setPaymentAmount("");
    }
  };

  const handleUndoDebtPaid = async (ob: any) => {
    if (ob.isDeferred && ob.deferExpenseId) {
      const ok = await confirm({
        title: "Revertir aplazamiento",
        description: "¿Estás seguro de deshacer el aplazamiento de esta deuda para este mes?",
        confirmLabel: "Deshacer aplazamiento",
        variant: "danger",
      });
      if (ok) {
        await undoDeferDebtMonth(ob.debtId, ob.deferExpenseId);
      }
      return;
    }

    if (!ob.latestPaymentId) {
      toast.error("No se encontró un abono para revertir en este mes.");
      return;
    }

    const ok = await confirm({
      title: "Marcar deuda como pendiente",
      description:
        "Se revertirá el último abono de este mes para esta deuda y volverá a quedar pendiente.",
      confirmLabel: "Sí, revertir abono",
      variant: "danger",
    });

    if (!ok) return;

    await undoDebtPayment(ob.latestPaymentId);
  };

  const handleDeferDebt = (ob: any) => {
    setDeferTargetObligation(ob);
    setDeferDialogOpen(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Urgent Today Panel — current month only */}
      <TodayUrgentPanel
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        obligations={selectedStats.allObligations}
      />

      {/* Month Selector Card */}
      <div
        className={`p-4 border rounded-3xl shadow-md ${
          theme === "dark"
            ? "bg-slate-900/40 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Cronograma de Pagos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black transition cursor-pointer text-slate-600 dark:text-slate-400"
            >
              &lt;
            </button>
            <span className="text-xs font-black text-indigo-500 bg-indigo-500/5 px-3 py-1 rounded-xl border border-indigo-500/10">
              Año {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black transition cursor-pointer text-slate-600 dark:text-slate-400"
            >
              &gt;
            </button>
          </div>
        </div>
        <div className="flex overflow-x-auto snap-x scrollbar-hide gap-2 pb-2">
          {MONTHS.map((m, idx) => {
            const isSelected = selectedMonth === idx + 1;
            const stats = yearlyChartData[idx];
            return (
              <button
                key={m.name}
                onClick={() => setSelectedMonth(idx + 1)}
                className={`min-w-[4.5rem] flex-1 py-3 px-1.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-between gap-1.5 snap-start shrink-0 ${
                  isSelected
                    ? theme === "dark"
                      ? "bg-slate-100 text-slate-950 font-black shadow-md border-slate-200"
                      : "bg-slate-950 text-white font-black shadow-md border-slate-900"
                    : theme === "dark"
                      ? "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-white"
                      : "bg-slate-50 border-slate-150 text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="text-xs uppercase font-extrabold tracking-wider">
                  {m.name}
                </span>
                {stats.totalDue > 0 ? (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? theme === "dark"
                          ? "bg-slate-900/10 text-slate-900"
                          : "bg-white/10 text-white"
                        : theme === "dark"
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {stats.totalPaid >= stats.totalDue
                      ? "✅"
                      : formatCurrency(stats.totalDue)}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 font-medium">
                    -
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Progress Circle */}
        <div
          className={`lg:col-span-3 p-7 lg:p-8 border rounded-3xl shadow-xl flex flex-col justify-between ${
            theme === "dark"
              ? "bg-slate-900/60 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base lg:text-lg font-black mb-2 flex items-center gap-2">
                <span>Progreso del Mes</span>
                <span className="text-sm text-indigo-500 font-bold">
                  ({MONTHS[selectedMonth - 1].fullName})
                </span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold max-w-xl">
                Mapea el porcentaje de obligaciones de este mes que has liquidado.
              </p>
            </div>
          </div>

          <div className="my-7 flex flex-col items-center justify-center">
            {selectedStats.totalDue > 0 ? (
              (() => {
                const percent = selectedStats.totalPaid >= selectedStats.totalDue 
                  ? 100 
                  : Math.floor((selectedStats.totalPaid / selectedStats.totalDue) * 100);
                const strokeDashoffset = 251.2 - (251.2 * percent) / 100;
                return (
                  <div className="relative w-40 h-40 lg:w-44 lg:h-44 flex items-center justify-center">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className={
                          theme === "dark"
                            ? "stroke-slate-800"
                            : "stroke-slate-100"
                        }
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-indigo-500 transition-all duration-1000"
                        strokeWidth="10"
                        strokeDasharray="251.2"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span
                        className={`text-3xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                      >
                        {percent}%
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                        Cubierto
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-36 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-10 h-10 text-slate-400 mb-2 animate-pulse" />
                <span className="text-xs text-slate-500 font-bold">
                  Sin gastos obligatorios
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-850 pt-5 text-xs font-semibold">
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-450 tracking-wider mb-1">
                Flujo de Ingresos
              </span>
              <span className="text-base font-black text-emerald-500">
                {formatCurrency(selectedStats.totalIncome)}
              </span>
              {selectedStats.primasIncome > 0 && (
                <span className="block text-[10px] mt-1 text-indigo-500 font-bold">
                  + {formatCurrency(selectedStats.primasIncome)} Primas autocalculadas
                </span>
              )}
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Pagos proyectados
              </span>
              <span
                className={`text-base font-black ${projectedPaymentsFlow > 0 ? "text-rose-500" : "text-slate-400"}`}
              >
                {formatCurrency(projectedPaymentsFlow)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Disponible proyectado
              </span>
              <span
                className={`text-base font-black ${projectedAvailableAfterPayments >= 0 ? "text-emerald-500" : "text-rose-500"}`}
              >
                {formatCurrency(projectedAvailableAfterPayments)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pagado real a hoy
              </span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                {formatCurrency(realPaymentsFlow)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Disponible real a hoy
              </span>
              <span className={`text-sm font-black ${realAvailableAfterPayments >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatCurrency(realAvailableAfterPayments)}
              </span>
            </div>
          </div>
        </div>

        {/* 12-Month Bar Chart */}
        <div
          className={`p-6 border rounded-3xl shadow-xl lg:col-span-3 flex flex-col justify-between ${
            theme === "dark"
              ? "bg-slate-900/60 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <h3 className="text-sm font-black mb-1">Carga Mensual Estimada</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              Vista mensual de carga y pagado. Haz clic en una barra para
              planificar.
            </p>
          </div>

          <div className="h-52 flex items-end justify-between gap-2 pt-4 pb-2 px-1">
            {yearlyChartData.map((d) => {
              const isSelected = selectedMonth === d.monthNum;
              const duePercent =
                d.totalDue > 0
                  ? Math.floor((d.totalDue / maxYearlyDue) * 100)
                  : 0;
              const paidCoveragePercent =
                d.totalDue > 0
                  ? (d.totalPaid >= d.totalDue ? 100 : Math.floor((d.totalPaid / d.totalDue) * 100))
                  : 0;
              const barHeightPercent =
                d.totalDue > 0 ? Math.max(12, duePercent) : 0;
              const dueHeightClass = percentToHeightClass(barHeightPercent);
              const paidHeightClass = percentToHeightClass(paidCoveragePercent);
              const isPaidFull = d.totalDue > 0 && d.totalPaid >= d.totalDue;

              return (
                <button
                  key={d.monthLabel}
                  onClick={() => setSelectedMonth(d.monthNum)}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full group focus:outline-none cursor-pointer"
                  title={
                    d.totalDue > 0
                      ? `${d.monthLabel}: carga ${duePercent}% · cubierto ${paidCoveragePercent}%`
                      : `${d.monthLabel}: sin carga`
                  }
                >
                  <div
                    className={`w-full flex-1 rounded-2xl relative overflow-hidden transition-all duration-300 ${
                      theme === "dark"
                        ? isSelected
                          ? "bg-slate-800/90"
                          : "bg-slate-900/70"
                        : isSelected
                          ? "bg-slate-100"
                          : "bg-slate-100/80"
                    }`}
                  >
                    {d.totalDue > 0 ? (
                      <div
                        className={`absolute inset-x-0 bottom-0 rounded-t-2xl transition-all duration-500 ${dueHeightClass} ${
                          isSelected
                            ? "bg-slate-500/95"
                            : theme === "dark"
                              ? "bg-slate-600/80 group-hover:bg-slate-500"
                              : "bg-slate-300/90 group-hover:bg-slate-400"
                        }`}
                      >
                        <div
                          className={`absolute inset-x-0 bottom-0 rounded-t-2xl transition-all duration-500 ${paidHeightClass} ${
                            isPaidFull ? "bg-indigo-500" : "bg-indigo-500/85"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-1.5 h-1.5 rounded-full bg-slate-400/60" />
                    )}
                  </div>

                  <span
                    className={`text-[9px] font-bold ${isSelected ? "text-indigo-500" : "text-slate-400"}`}
                  >
                    {d.monthLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-bold text-slate-500 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-500"></span>Carga
              mensual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>Pagado
              acumulado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-300"></span>Escala
              anual
            </span>
          </div>
        </div>
      </div>

      {/* Obligations and Income List */}
      <div
        className={`p-6 border rounded-3xl shadow-xl ${
          theme === "dark"
            ? "bg-slate-900/60 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
          <div>
            <h3 className="text-base font-black">
              Planificación y Detalle de Pagos
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Egresos, ingresos extraordinarios y cuotas correspondientes a este
              mes.
            </p>

            <div id="schedule-tabs" className="mt-3 inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-900/60 gap-1">
              <button
                type="button"
                onClick={() => setScheduleTab("pending")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${
                  scheduleTab === "pending"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Por pagar
                <span className="ml-1.5 opacity-80">
                  (
                  {
                    selectedStats.allObligations.filter(
                      (ob) => !ob.isPaid && !("isIncome" in ob),
                    ).length
                  }
                  )
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleTab("paid")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${
                  scheduleTab === "paid"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Pagados
                <span className="ml-1.5 opacity-80">
                  (
                  {
                    selectedStats.allObligations.filter((ob) => ob.isPaid)
                      .length
                  }
                  )
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scheduleTab === "pending" && filteredObligations.length > 0 && (
              <button
                onClick={handlePayAll}
                className="hidden sm:flex px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black transition cursor-pointer items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Pagar Todos</span>
              </button>
            )}
            {scheduleTab === "paid" && filteredObligations.length > 0 && (
              <button
                onClick={handleRevertAll}
                className="hidden sm:flex px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-black transition cursor-pointer items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Revertir Todos</span>
              </button>
            )}
            <button
              onClick={() => setIsPlanOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Planificar Mes</span>
            </button>
          </div>
        </div>

        {filteredObligations.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center text-slate-500">
            <Info className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs font-bold">
              {scheduleTab === "pending"
                ? "No hay transacciones pendientes en este mes."
                : "No hay transacciones pagadas en este mes."}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">
              Haz clic en "Planificar Mes" para asignar un ingreso, gasto o pago
              a deuda específico.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedObligations.map((ob, idx) => {
              const catInfo = getCategoryColor(ob.category);
              return (
                <div
                  key={`${ob.id}-${obligationsPage}-${idx}`}
                  className={`p-4 border rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    "isIncome" in ob
                      ? "bg-emerald-500/3 dark:bg-emerald-500/2 border-emerald-500/15"
                      : ob.isPaid
                        ? "bg-indigo-500/3 dark:bg-indigo-500/2 border-indigo-500/15"
                        : theme === "dark"
                          ? "bg-slate-950/40 border-slate-850 hover:bg-slate-800/10"
                          : "bg-slate-50 border-slate-150 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl border ${
                        "isIncome" in ob
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : ob.isPaid
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}
                    >
                      {"isIncome" in ob ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : ob.isPaid ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black ${theme === "dark" ? "text-white" : "text-slate-950"}`}
                        >
                          {ob.title}
                        </span>
                        {"isRecurrentTemplate" in ob && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                            Fijo
                          </span>
                        )}
                        {"isDebt" in ob && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                            Deuda
                          </span>
                        )}
                        {"isDeferred" in ob && ob.isDeferred && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-slate-500/10 text-slate-500 border border-slate-500/20 px-1.5 py-0.5 rounded-full">
                            Aplazado
                          </span>
                        )}
                        {"isIncome" in ob && (
                          <span className="text-[8px] uppercase tracking-wider font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                            Ingreso
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catInfo}`}
                        >
                          <span className="mr-1">
                            {getCategoryEmoji(ob.category)}
                          </span>
                          {ob.category}
                        </span>
                        {"deferReason" in ob && ob.deferReason && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                            Motivo: {ob.deferReason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-150 dark:border-slate-850 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                        {"isIncome" in ob
                          ? "Monto Ingresado"
                          : "Monto Obligación"}
                      </span>
                      <span
                        className={`text-sm font-black ${"isIncome" in ob ? "text-emerald-500" : theme === "dark" ? "text-white" : "text-slate-900"}`}
                      >
                        {"isIncome" in ob ? "+" : "-"}
                        {formatCurrency(ob.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {"isDebt" in ob && ob.isDebt ? (
                        ob.isPaid ? (
                          ob.isDeferred ? (
                            <button
                              onClick={() => handleUndoDebtPaid(ob)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Deshacer Aplazamiento</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUndoDebtPaid(ob)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Marcar Pendiente</span>
                            </button>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeferDebt(ob)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              title="Aplazar cuota para este mes"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Aplazar</span>
                            </button>
                            <button
                              onClick={() => {
                                setPayingDebtId(ob.debtId);
                                setPaymentAmount(ob.amount);
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Abonar</span>
                            </button>
                          </div>
                        )
                      ) : "isRecurrentTemplate" in ob ? (
                        <button
                          onClick={() => handleToggleRecurrent(ob)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950"
                        >
                          {ob.isPaid ? "Marcar Pendiente" : "Pagar Factura"}
                        </button>
                      ) : "isIncome" in ob ? (
                        <button
                          onClick={() => handleDelete(ob.id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                          title="Eliminar Ingreso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!ob.isPaid && (
                            <button
                              onClick={() => handleDeferOneTime(ob)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              title="Aplazar al siguiente mes"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Aplazar</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleOneTime(ob)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950"
                          >
                            {ob.isPaid ? "Marcar Pendiente" : "Pagar Factura"}
                          </button>
                          <button
                            onClick={() => handleDelete(ob.id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                            title="Eliminar Gasto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <Pagination
              currentPage={obligationsPage}
              totalPages={totalObligationPages}
              onPageChange={setObligationsPage}
              totalItems={filteredObligations.length}
              itemsPerPage={OBLIGATIONS_PER_PAGE}
            />
          </div>
        )}
      </div>

      {/* Plan modal */}
      <PlanModal
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        debts={debts}
        addExpense={addExpense}
        theme={theme}
      />

      {/* Debt payment modal */}
      {payingDebtId &&
        createPortal(
          <div className="fixed inset-0 z-9999 bg-slate-950/65 backdrop-blur-md supports-backdrop-filter:bg-slate-950/45 flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl relative space-y-4 ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800"
                  : "bg-white border-slate-200"
              }`}
            >
              <button
                onClick={() => {
                  setPayingDebtId(null);
                  setPaymentAmount("");
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black">
                  Registrar Abono a Deuda
                </h3>
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Ingresa el monto que vas a abonar. Este monto se reducirá de la
                deuda y creará un registro de pago.
              </p>

              <form onSubmit={handlePayDebtSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
                    Monto de Pago ($)
                  </label>
                  <CurrencyInput
                    value={paymentAmount === "" ? undefined : paymentAmount}
                    onChange={(val) => setPaymentAmount(val)}
                    required
                    placeholder="Ej. 250000"
                    title="Monto de pago"
                    className={`w-full border rounded-xl py-2.5 focus:outline-none transition ${
                      theme === "dark"
                        ? "bg-slate-950/80 border-slate-800 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayingDebtId(null);
                      setPaymentAmount("");
                    }}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md cursor-pointer"
                  >
                    Confirmar Abono
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <DeferDebtDialog
        open={deferDialogOpen}
        onOpenChange={setDeferDialogOpen}
        debtTitle={deferTargetObligation?.title || ""}
        onConfirm={async (observation) => {
          if (!deferTargetObligation) return false;
          try {
            await deferDebtMonth(
              deferTargetObligation.debtId,
              selectedMonth,
              selectedYear,
              observation
            );
            return true;
          } catch (err) {
            console.error(err);
            return false;
          }
        }}
      />

      <MonthCloseWizard month={selectedMonth} year={selectedYear} />
    </div>
  );
}
