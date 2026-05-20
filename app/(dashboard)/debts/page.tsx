"use client";

import React, { useState, useMemo } from "react";
import { useFinance } from "@/providers/finance-provider";
import { DebtCard } from "@/components/debts/debt-card";
import { DebtForm } from "@/components/debts/debt-form";
import { PaymentDialog } from "@/components/debts/payment-dialog";
import { DebtDetailDialog } from "@/components/debts/debt-detail-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { Debt } from "@/types";
import { ShieldAlert } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function DebtsPage() {
  const { debts, addDebt, updateDebt, deleteDebt, recordDebtPayment } =
    useFinance();

  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const totalPages = Math.ceil(debts.length / ITEMS_PER_PAGE);
  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return debts.slice(start, start + ITEMS_PER_PAGE);
  }, [debts, currentPage]);

  const handleSaveDebt = async (payload: Omit<Debt, "id" | "user_id" | "created_at">) => {
    if (editingDebt) {
      await updateDebt(editingDebt.id, payload);
      setEditingDebt(null);
    } else {
      await addDebt(payload);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteDebt(deleteId);
      setDeleteId(null);
    }
  };

  const handleRecordPayment = async (amount: number) => {
    if (!payingDebtId) return;
    await recordDebtPayment(payingDebtId, amount);
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
                    onAbonarClick={setPayingDebtId}
                    onStartEdit={setEditingDebt}
                    onDelete={(id) => setDeleteId(id)}
                    onViewDetail={setDetailDebt}
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
      <div className="w-full lg:w-2/5">
        <div className="sticky top-28">
          <DebtForm
            editingDebt={editingDebt}
            onSave={handleSaveDebt}
            onCancelEdit={() => setEditingDebt(null)}
          />
        </div>
      </div>

      {/* Detail Dialog */}
      <DebtDetailDialog
        debt={detailDebt}
        open={!!detailDebt}
        onOpenChange={(open) => { if (!open) setDetailDebt(null); }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Eliminar Deuda"
        description="¿Estás seguro de que quieres eliminar esta deuda? Esta acción no se puede deshacer y perderás el historial de pagos asociado."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
