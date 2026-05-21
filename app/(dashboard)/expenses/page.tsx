"use client";

import React, { useState, useMemo } from "react";
import { useFinance } from "@/providers/finance-provider";
import { ExpenseCard } from "@/components/expenses/expense-card";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseDetailDialog } from "@/components/expenses/expense-detail-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { Expense } from "@/types";
import { CATEGORIES_LIST, getCategoryColor, getCategoryEmoji } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { isSystemExpense } from "@/lib/finance-calculations";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useConfirm } from "@/providers/confirm-provider";
import { CreditCard, Plus, ArrowDownCircle, ArrowUpCircle, CalendarDays, Clock3, Eye, Trash2 } from "lucide-react";
import { CategoryBudgetHint } from "@/components/expenses/category-budget-hint";

const ITEMS_PER_PAGE = 6;
const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000, 100_000, 200_000];

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useFinance();

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<"recurring" | "month">("month");
  const [recurringPage, setRecurringPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState<number | "">("");
  const [txCategory, setTxCategory] = useState("Comida");
  const [txMarkAsPaid, setTxMarkAsPaid] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const handleSaveExpense = async (payload: Omit<Expense, "id" | "user_id" | "created_at" | "paid_date">) => {
    if (editingExpense) {
      const ok = await confirm({
        title: "Actualizar movimiento",
        description: "¿Estás seguro de que deseas guardar los cambios en este movimiento?",
        confirmLabel: "Guardar Cambios",
      });
      if (!ok) return;

      await updateExpense(editingExpense.id, payload);
      setEditingExpense(null);
    } else {
      const ok = await confirm({
        title: "Crear plantilla",
        description: "¿Deseas crear esta nueva plantilla de gasto recurrente?",
        confirmLabel: "Crear",
      });
      if (!ok) return;

      await addExpense(payload);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar Gasto",
      description: "¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (ok) {
      await deleteExpense(id);
    }
  };

  const handleCreateMonthlyTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle || !txAmount) return;
    const value = txAmount as number;
    if (isNaN(value) || value <= 0) return;

    const ok = await confirm({
      title: "Registrar movimiento",
      description: `¿Estás seguro de registrar este ${txType === "income" ? "ingreso" : "gasto"} por valor de ${formatCurrency(value)}?`,
      confirmLabel: "Registrar",
    });
    if (!ok) return;

    const payload: Omit<Expense, "id" | "user_id" | "created_at" | "paid_date"> = {
      title: txTitle,
      amount: value,
      category: txType === "income" ? "Ingresos" : txCategory,
      type: "one-time",
      status: txType === "income" || txMarkAsPaid ? "paid" : "pending",
      due_date: new Date().toISOString().slice(0, 10),
    };

    const created = await addExpense(payload);
    if (created) {
      setTxTitle("");
      setTxAmount("");
      setTxCategory("Comida");
      setTxMarkAsPaid(false);
      setActiveTab("month");
      setHistoryPage(1);
    }
  };

  // Recurrent templates only (one-time expenses are managed in payment schedule)
  const recurrentTemplates = useMemo(() => {
    return expenses.filter((e) => e.type === "recurrent" && !isSystemExpense(e));
  }, [expenses]);

  const currentMonthTransactions = expenses.filter((e) => {
    if (e.type !== "one-time" || isSystemExpense(e)) return false;
    const referenceDate = e.status === "paid" ? e.paid_date || e.created_at : e.due_date || e.created_at;
    if (!referenceDate) return false;

    if (/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
      const [y, m] = referenceDate.split("-").map(Number);
      return y === currentYear && m === currentMonth;
    }

    const date = new Date(referenceDate);
    if (isNaN(date.getTime())) return false;
    return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
  });

  // Filtered month transactions
  const filteredMonthTransactions = useMemo(() => {
    if (!categoryFilter) return currentMonthTransactions;
    if (categoryFilter === "Ingresos") return currentMonthTransactions.filter((e) => e.category === "Ingresos");
    return currentMonthTransactions.filter((e) => e.category === categoryFilter);
  }, [currentMonthTransactions, categoryFilter]);

  // Pagination
  const recurringTotalPages = Math.ceil(recurrentTemplates.length / ITEMS_PER_PAGE);
  const paginatedRecurrent = useMemo(() => {
    const start = (recurringPage - 1) * ITEMS_PER_PAGE;
    return recurrentTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [recurrentTemplates, recurringPage]);

  const historyTotalPages = Math.ceil(filteredMonthTransactions.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return filteredMonthTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMonthTransactions, historyPage]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Left Column: Filter and List */}
      <div className="w-full lg:w-3/5 space-y-6">

        <div className="border rounded-2xl p-1.5 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 inline-flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("recurring")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === "recurring"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Recurrencias
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("month")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === "month"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Mes en curso
          </button>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span>{activeTab === "recurring" ? "Lista de Recurrencias" : `Historial del Mes (${today.toLocaleString("es-CO", { month: "long" })})`}</span>
            <span className="text-xs bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-indigo-500 px-2 py-0.5 rounded-full font-black">
              {activeTab === "recurring" ? recurrentTemplates.length : filteredMonthTransactions.length}
            </span>
          </h2>

          {/* Category filter chips — only in month tab */}
          {activeTab === "month" && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setCategoryFilter(null); setHistoryPage(1); }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                  categoryFilter === null
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                }`}
              >
                Todos
              </button>
              {CATEGORIES_LIST.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { setCategoryFilter(c.name); setHistoryPage(1); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                    categoryFilter === c.name
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === "recurring" && recurrentTemplates.length === 0 ? (
            <div className="border border-dashed rounded-3xl p-12 text-center bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-800">
              <CreditCard className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay recurrencias registradas</h3>
              <p className="text-xs text-slate-500 mt-1">Crea tu primera plantilla mensual en el formulario lateral.</p>
            </div>
          ) : activeTab === "month" && currentMonthTransactions.length === 0 ? (
            <div className="border border-dashed rounded-3xl p-12 text-center bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-800">
              <CalendarDays className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">No hay movimientos en el mes actual</h3>
              <p className="text-xs text-slate-500 mt-1">Registra un gasto o ingreso en el panel lateral para verlo en este historial.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {activeTab === "recurring"
                  ? paginatedRecurrent.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        isEditing={editingExpense?.id === expense.id}
                        onStartEdit={setEditingExpense}
                        onDelete={handleDelete}
                        onViewDetail={setDetailExpense}
                      />
                    ))
                  : paginatedHistory.map((expense) => (
                      <div
                        key={expense.id}
                        className="border rounded-2xl p-4 bg-white dark:bg-slate-900/55 border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shrink-0 ${getCategoryColor(expense.category)}`}>
                            {getCategoryEmoji(expense.category)}
                          </div>

                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold truncate">{expense.title}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              expense.category === "Ingresos"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}>
                              {expense.category === "Ingresos" ? "Ingreso" : "Gasto"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                            <Clock3 className="w-3 h-3" />
                            {expense.status === "paid" ? "Aplicado" : "Pendiente de pago en cronograma"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-black ${expense.category === "Ingresos" ? "text-emerald-500" : "text-rose-500"}`}>
                            {expense.category === "Ingresos" ? "+" : "-"}{formatCurrency(expense.amount)}
                          </p>
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setDetailExpense(expense)}
                              className="p-1.5 rounded-lg border transition cursor-pointer bg-slate-100 hover:bg-indigo-500/10 hover:text-indigo-500 border-slate-200 text-slate-500"
                              title="Ver Detalle"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-1.5 rounded-lg border transition cursor-pointer bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 border-slate-200 hover:border-rose-500/20 text-slate-500"
                              title="Eliminar Gasto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
              {activeTab === "recurring" ? (
                <Pagination
                  currentPage={recurringPage}
                  totalPages={recurringTotalPages}
                  onPageChange={setRecurringPage}
                  totalItems={recurrentTemplates.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              ) : (
                <Pagination
                  currentPage={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={setHistoryPage}
                  totalItems={currentMonthTransactions.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="w-full lg:w-2/5">
        <div className="sticky top-28">
          {activeTab === "recurring" ? (
            <ExpenseForm
              editingExpense={editingExpense}
              onSave={handleSaveExpense}
              onCancelEdit={() => setEditingExpense(null)}
            />
          ) : (
            <div className="border rounded-3xl p-6 shadow-xl space-y-5 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-500/5 text-slate-500 border border-slate-500/10">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold">Registrar Movimiento del Mes</h3>
              </div>

              <form onSubmit={handleCreateMonthlyTransaction} className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("expense");
                    }}
                    className={`flex-1 py-2 text-xs rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                      txType === "expense"
                        ? "bg-amber-100 border-amber-300 text-amber-800 ring-2 ring-amber-300/70 shadow-sm shadow-amber-500/20"
                        : "border-slate-200 text-slate-600"
                    }`}
                    title="Seleccionar tipo gasto"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" /> Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("income");
                      setTxMarkAsPaid(true);
                    }}
                    className={`flex-1 py-2 text-xs rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                      txType === "income"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800 ring-2 ring-emerald-300/70 shadow-sm shadow-emerald-500/20"
                        : "border-slate-200 text-slate-600"
                    }`}
                    title="Seleccionar tipo ingreso"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Ingreso
                  </button>
                </div>

                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Concepto</label>
                  <input
                    type="text"
                    value={txTitle}
                    onChange={(e) => setTxTitle(e.target.value)}
                    placeholder={txType === "income" ? "Ej. Pago freelance" : "Ej. Mercado, gasolina"}
                    className="w-full border rounded-xl py-2.5 px-3.5 text-sm font-semibold bg-slate-50 border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Monto ($)</label>
                  <CurrencyInput
                    value={txAmount === "" ? undefined : txAmount}
                    onChange={(val) => setTxAmount(val)}
                    placeholder="Monto"
                    title="Monto del movimiento"
                    className="w-full border rounded-xl py-2.5 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:border-indigo-400 transition"
                  />
                  {/* Quick amount chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setTxAmount(q)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          txAmount === q
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        ${(q / 1000).toFixed(0)}K
                      </button>
                    ))}
                  </div>
                </div>

                {txType === "expense" && (
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Categoría</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES_LIST.filter((c) => c.name !== "Ingresos").map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setTxCategory(c.name)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                            txCategory === c.name
                              ? "bg-indigo-100 border-indigo-300 text-indigo-800 ring-2 ring-indigo-300/70 shadow-sm shadow-indigo-500/20"
                              : "border-slate-200 text-slate-600"
                          }`}
                          title={`Seleccionar categoría ${c.name}`}
                        >
                          {c.emoji} {c.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <CategoryBudgetHint
                        category={txCategory}
                        amount={(txAmount as number) || 0}
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={txType === "income" ? true : txMarkAsPaid}
                    onChange={(e) => setTxMarkAsPaid(e.target.checked)}
                    disabled={txType === "income"}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    Registrar como pagado
                    {txType === "income" && <span className="text-slate-500"> (obligatorio para ingresos)</span>}
                  </span>
                </label>

                <p className="text-[11px] text-slate-500 font-semibold">
                  El movimiento se aplica automáticamente al <span className="font-black">mes en curso</span> y su estado se refleja en el cronograma mensual.
                </p>

                <button type="submit" className="w-full py-3 text-sm font-bold rounded-xl">
                  Guardar movimiento del mes
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <ExpenseDetailDialog
        expense={detailExpense}
        open={!!detailExpense}
        onOpenChange={(open) => { if (!open) setDetailExpense(null); }}
      />
    </div>
  );
}
