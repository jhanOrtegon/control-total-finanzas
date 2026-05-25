"use client";

import React, { useState, useMemo } from "react";
import { useFinance } from "@/providers/finance-provider";
import { DebtCard } from "@/components/debts/debt-card";
import { DebtForm } from "@/components/debts/debt-form";
import { PaymentDialog } from "@/components/debts/payment-dialog";
import { DebtDetailDialog } from "@/components/debts/debt-detail-dialog";
import { useConfirm } from "@/providers/confirm-provider";
import { Pagination } from "@/components/shared/pagination";
import { Debt } from "@/types";
import { ShieldAlert, Sparkles } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";

const ITEMS_PER_PAGE = 5;

export default function DebtsPage() {
  const { debts, addDebt, updateDebt, deleteDebt, recordDebtPayment, undoDebtPayment, debtPayments } =
    useFinance();

  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [extraPayment, setExtraPayment] = useState<number>(100000);
  const { theme } = useTheme();
  const confirm = useConfirm();

  // Pagination
  const totalPages = Math.ceil(debts.length / ITEMS_PER_PAGE);
  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return debts.slice(start, start + ITEMS_PER_PAGE);
  }, [debts, currentPage]);

  // Payoff simulation math
  const { monthsWithout, monthsWith, monthsSaved } = useMemo(() => {
    const activeDebtsList = debts
      .filter((d) => d.remaining_amount > 0)
      .map((d) => ({
        balance: d.remaining_amount,
        minPay: d.minimum_payment > 0 ? d.minimum_payment : Math.max(1000, d.remaining_amount * 0.05),
      }));

    if (activeDebtsList.length === 0) {
      return { monthsWithout: 0, monthsWith: 0, monthsSaved: 0 };
    }

    // 1. Without extra payment
    let monthsWithout = 0;
    let tempDebts = activeDebtsList.map((d) => ({ ...d }));
    while (tempDebts.some((d) => d.balance > 0) && monthsWithout < 360) {
      monthsWithout++;
      for (const d of tempDebts) {
        if (d.balance > 0) {
          d.balance = Math.max(0, d.balance - d.minPay);
        }
      }
    }

    // 2. With extra payment (Snowball order)
    let monthsWith = 0;
    let tempDebtsWith = activeDebtsList.map((d) => ({ ...d }));
    while (tempDebtsWith.some((d) => d.balance > 0) && monthsWith < 360) {
      monthsWith++;
      let extraPool = extraPayment;
      // Pay minimums
      for (const d of tempDebtsWith) {
        if (d.balance > 0) {
          const paid = Math.min(d.minPay, d.balance);
          d.balance -= paid;
          if (d.balance === 0) {
            extraPool += d.minPay;
          }
        }
      }
      // Apply extra payments using Snowball (smallest balance first)
      tempDebtsWith.sort((a, b) => a.balance - b.balance);
      for (const d of tempDebtsWith) {
        if (d.balance > 0 && extraPool > 0) {
          const paid = Math.min(extraPool, d.balance);
          d.balance -= paid;
          extraPool -= paid;
          if (d.balance === 0) {
            extraPool += d.minPay;
          }
        }
      }
    }

    return {
      monthsWithout,
      monthsWith,
      monthsSaved: Math.max(0, monthsWithout - monthsWith),
    };
  }, [debts, extraPayment]);

  const handleSaveDebt = async (payload: Omit<Debt, "id" | "user_id" | "created_at">) => {
    if (editingDebt) {
      const ok = await confirm({
        title: "Actualizar Deuda",
        description: "¿Estás seguro de que deseas guardar los cambios en esta deuda?",
        confirmLabel: "Guardar Cambios",
      });
      if (!ok) return false;

      await updateDebt(editingDebt.id, payload);
      setEditingDebt(null);
      return true;
    } else {
      const ok = await confirm({
        title: "Registrar Deuda",
        description: "¿Confirmas el registro de esta nueva deuda?",
        confirmLabel: "Registrar",
      });
      if (!ok) return false;

      await addDebt(payload);
      return true;
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar Deuda",
      description: "¿Estás seguro de que quieres eliminar esta deuda? Esta acción no se puede deshacer y perderás el historial de pagos asociado.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (ok) {
      await deleteDebt(id);
    }
  };

  const handleRecordPayment = async (amount: number) => {
    if (!payingDebtId) return;
    await recordDebtPayment(payingDebtId, amount);
  };

  const handleUndoLastPayment = async (debtId: string) => {
    const paymentsForDebt = debtPayments.filter(p => p.debt_id === debtId);
    if (paymentsForDebt.length === 0) return;
    
    paymentsForDebt.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    const latestPayment = paymentsForDebt[0];
    
    const ok = await confirm({
      title: "Revertir último abono",
      description: `¿Estás seguro de deshacer el último abono de ${formatCurrency(latestPayment.amount)}? El saldo de la deuda aumentará.`,
      confirmLabel: "Revertir Abono",
      variant: "danger",
    });
    
    if (ok) {
      await undoDebtPayment(latestPayment.id);
    }
  };

  const activePayingDebt = debts.find((d) => d.id === payingDebtId);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Column */}
      <div className="w-full lg:w-3/5 space-y-6">
        
        {/* Payment Input Form */}
        {payingDebtId && activePayingDebt && (
          <div className="animate-in fade-in duration-200">
            <PaymentDialog
              debtTitle={activePayingDebt.title}
              maxAmount={activePayingDebt.remaining_amount}
              onConfirm={handleRecordPayment}
              onClose={() => setPayingDebtId(null)}
            />
          </div>
        )}

        {/* Debts List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span>Lista de Deudas Activas</span>
            <span className="text-xs bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-rose-500 px-2 py-0.5 rounded-full font-black">
              {debts.length}
            </span>
          </h2>

          {debts.length === 0 ? (
            <div className="border border-dashed rounded-3xl p-12 text-center bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-800">
              <ShieldAlert className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">¡Libre de Deudas!</h3>
              <p className="text-xs text-slate-500 mt-1">Registra tus préstamos, créditos o tarjetas de crédito a la derecha.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {paginatedDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isEditing={editingDebt?.id === debt.id}
                    hasPayments={debtPayments.some(p => p.debt_id === debt.id)}
                    onAbonarClick={setPayingDebtId}
                    onStartEdit={setEditingDebt}
                    onDelete={handleDelete}
                    onViewDetail={setDetailDebt}
                    onUndoLastPayment={handleUndoLastPayment}
                  />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={debts.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </div>
      </div>

      {/* Right Column: Add/Edit Form */}
      <div className="w-full lg:w-2/5 space-y-6">
        <div className="sticky top-28 space-y-6">
          <DebtForm
            editingDebt={editingDebt}
            onSave={handleSaveDebt}
            onCancelEdit={() => setEditingDebt(null)}
          />

          {debts.some((d) => d.remaining_amount > 0) && (
            <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${
              theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Simulador de Pago Acelerado</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Mira cuántos meses te ahorras sumando un abono extraordinario mensual.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Abono Mensual Extra:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(extraPayment)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000000"
                    step="50000"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 border border-slate-200/50 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Sin abono extra</span>
                    <p className="text-sm font-black text-slate-600 dark:text-slate-300 mt-1">{monthsWithout} meses</p>
                  </div>
                  <div className="p-3 border border-indigo-200/50 dark:border-indigo-900/20 rounded-2xl bg-indigo-500/5">
                    <span className="text-[9px] uppercase font-bold text-indigo-400">Con abono extra</span>
                    <p className="text-sm font-black text-indigo-500 mt-1">{monthsWith} meses</p>
                  </div>
                </div>

                {monthsSaved > 0 ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold leading-relaxed">
                    🎉 ¡Abonando {formatCurrency(extraPayment)} mensuales, saldrás de deudas **{monthsSaved} meses antes**! Liquidarás todo en **{monthsWith} meses** en lugar de {monthsWithout} meses.
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                    Desliza para simular un abono extra y acelerar tu plan de salida de deudas.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <DebtDetailDialog
        debt={detailDebt}
        open={!!detailDebt}
        onOpenChange={(open) => { if (!open) setDetailDebt(null); }}
      />
    </div>
  );
}
