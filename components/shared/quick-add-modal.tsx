"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFinance } from "@/providers/finance-provider";
import { useConfirm } from "@/providers/confirm-provider";
import { CATEGORIES_LIST, getCategoryEmoji } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  X,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Zap,
} from "lucide-react";

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000, 100_000, 200_000];

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const { addExpense } = useFinance();
  const confirm = useConfirm();
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState("Comida");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTxType("expense");
      setTitle("");
      setAmount("");
      setCategory("Comida");
      setMarkAsPaid(false);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    const val = amount as number;
    if (isNaN(val) || val <= 0) return;

    const ok = await confirm({
      title: txType === "income" ? "Registrar ingreso" : "Registrar gasto",
      description: `¿Confirmas ${txType === "income" ? "el ingreso" : "el gasto"} de ${formatCurrency(val)} — ${title}?`,
      confirmLabel: "Registrar",
    });
    if (!ok) return;

    setSaving(true);
    try {
      await addExpense({
        title: title.trim(),
        amount: val,
        category: txType === "income" ? "Ingresos" : category,
        type: "one-time",
        status: txType === "income" || markAsPaid ? "paid" : "pending",
        due_date: new Date().toISOString().slice(0, 10),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label="Registro rápido de movimiento"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Zap className="w-4 h-4" />
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Registro Rápido</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Type toggle */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
              <button
                type="button"
                onClick={() => setTxType("expense")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  txType === "expense"
                    ? "bg-white dark:bg-slate-800 text-rose-600 shadow-sm border border-rose-200 dark:border-rose-900/40"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                Gasto
              </button>
              <button
                type="button"
                onClick={() => { setTxType("income"); setMarkAsPaid(true); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  txType === "income"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm border border-emerald-200 dark:border-emerald-900/40"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                Ingreso
              </button>
            </div>

            {/* Concept */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Concepto
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={txType === "income" ? "Ej. Pago freelance, salario…" : "Ej. Mercado, gasolina…"}
                className="w-full border rounded-xl py-2.5 px-3.5 text-sm font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Monto
              </label>
              <CurrencyInput
                value={amount === "" ? undefined : amount}
                onChange={(val) => setAmount(val)}
                placeholder="$ 0"
                className="w-full border rounded-xl py-2.5 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-indigo-400 text-sm font-semibold focus:outline-none transition"
              />
              {/* Quick amounts */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      amount === q
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                    }`}
                  >
                    {formatCurrency(q)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category (only for expense) */}
            {txType === "expense" && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Categoría
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CATEGORIES_LIST.filter((c) => c.name !== "Ingresos").map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setCategory(c.name)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                        category === c.name
                          ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                      }`}
                    >
                      <span className="text-base">{c.emoji}</span>
                      <span className="leading-tight text-center">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mark as paid */}
            {txType === "expense" && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Registrar como ya pagado
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!title.trim() || !amount || saving}
              className="w-full py-3.5 rounded-2xl text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {saving ? "Guardando…" : "Registrar movimiento"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
