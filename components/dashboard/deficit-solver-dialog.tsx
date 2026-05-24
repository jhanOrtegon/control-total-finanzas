"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, HelpCircle, Sparkles } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import {
  getExpenseDateInMonth,
  isDebtApplicableToMonth,
  isDebtDeferredInMonth,
  isDebtPaymentExpense,
  isDeferDebtExpense,
  isSystemExpense,
  getRecurrentTemplates
} from "@/lib/finance-calculations";
import { toast } from "sonner";

interface DeficitSolverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deficitAmount: number;
}

const NON_ESSENTIAL_CATEGORIES = [
  "Entretenimiento",
  "Suscripciones",
  "Regalos",
  "Belleza",
  "Ropa",
  "Viajes",
  "Otros",
];

export function DeficitSolverDialog({
  open,
  onOpenChange,
  deficitAmount,
}: DeficitSolverDialogProps) {
  const { theme } = useTheme();
  const { expenses, debts, deferDebtMonth, updateExpense } = useFinance();
  const { month, year } = useFinancePeriod();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Compute pending deferrable items
  const deferrableItems = useMemo(() => {
    const items: Array<{
      id: string; // expense id or debt id
      title: string;
      amount: number;
      type: "debt" | "expense";
      isEssential: boolean;
      originalExpense?: any;
    }> = [];

    // 1. Pending One-Time Expenses
    const recurrentTemplates = getRecurrentTemplates(expenses);
    const recurrentTitles = recurrentTemplates.map((e) => e.title.toLowerCase());

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

    for (const exp of oneTimePending) {
      items.push({
        id: exp.id,
        title: exp.title,
        amount: exp.amount,
        type: "expense",
        isEssential: !NON_ESSENTIAL_CATEGORIES.includes(exp.category),
        originalExpense: exp,
      });
    }

    // 2. Pending Debts Minimum Payments
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
          type: "debt",
          isEssential: false, // Debts are technically essential to avoid interest, but can be deferred. We treat them as non-essential for the solver to suggest them.
        });
      }
    }

    // Sort: Non-essential expenses first, then debts, then essential expenses
    return items.sort((a, b) => {
      if (a.isEssential !== b.isEssential) return a.isEssential ? 1 : -1;
      if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
      return b.amount - a.amount; // highest amount first
    });
  }, [expenses, debts, month, year]);

  const totalSelectedAmount = useMemo(() => {
    return deferrableItems
      .filter((item) => selectedIds.has(item.id))
      .reduce((acc, item) => acc + item.amount, 0);
  }, [deferrableItems, selectedIds]);

  const newDeficit = deficitAmount - totalSelectedAmount;
  const isResolved = newDeficit <= 0;

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos un pago para aplazar.");
      return;
    }

    setLoading(true);
    let successCount = 0;
    try {
      for (const item of deferrableItems) {
        if (!selectedIds.has(item.id)) continue;

        if (item.type === "debt") {
          const ok = await deferDebtMonth(item.id, month, year, "Aplazado por Asistente de IA (Déficit)");
          if (ok) successCount++;
        } else if (item.type === "expense" && item.originalExpense) {
          // Calculate next month's date
          const currentDueDate = new Date(item.originalExpense.due_date || new Date().toISOString());
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
          const nextMonthDate = currentDueDate.toISOString().slice(0, 10);
          
          const ok = await updateExpense(item.id, { due_date: nextMonthDate });
          if (ok) successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Se han aplazado ${successCount} obligaciones exitosamente.`);
        onOpenChange(false);
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error al procesar los aplazamientos.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && deferrableItems.length > 0 && selectedIds.size === 0) {
      let accumulated = 0;
      const initialSelection = new Set<string>();
      for (const item of deferrableItems) {
        if (accumulated < deficitAmount) {
          initialSelection.add(item.id);
          accumulated += item.amount;
        } else {
          break;
        }
      }
      setSelectedIds(initialSelection);
    }
  }, [open, deferrableItems, deficitAmount, selectedIds.size]);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val);
      }
    }}>
      <DialogContent showCloseButton={!loading} className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <DialogTitle>Asistente de Rescate Financiero</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Tu flujo de caja presenta un déficit de <strong className="text-rose-500">{formatCurrency(deficitAmount)}</strong>. 
            He analizado tus obligaciones de este mes y te sugiero aplazar los siguientes pagos para liberar cupo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Deficit Tracker */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isResolved 
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50" 
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
          }`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isResolved ? "text-emerald-600" : "text-rose-600"}`}>
                {isResolved ? "¡Déficit Resuelto!" : "Déficit Restante"}
              </span>
              <div className={`text-2xl font-black ${isResolved ? "text-emerald-500" : "text-rose-500"}`}>
                {isResolved ? "$0" : formatCurrency(Math.max(0, newDeficit))}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cupo Liberado
              </span>
              <div className="text-lg font-black text-indigo-500">
                {formatCurrency(totalSelectedAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Pagos Sugeridos para Aplazar</h4>
            
            {deferrableItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">No hay pagos pendientes viables para aplazar este mes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {deferrableItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSelection(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 dark:border-slate-700"
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold flex gap-2">
                            <span className={item.type === "debt" ? "text-amber-500" : "text-blue-500"}>
                              {item.type === "debt" ? "Deuda (Genera Interés)" : "Gasto"}
                            </span>
                            {!item.isEssential && <span className="text-emerald-500">No Esencial</span>}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-sm font-black ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}>
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 text-xs text-blue-600 dark:text-blue-400">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Nota:</strong> Los gastos variables seleccionados serán movidos al siguiente mes. Las cuotas de deuda aplazadas sumarán 1 mes al plazo original, lo cual puede generar intereses según tu entidad financiera.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || selectedIds.size === 0}
            className={`font-bold transition-all ${
              isResolved 
                ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {loading ? "Procesando..." : "Confirmar y Aplazar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
