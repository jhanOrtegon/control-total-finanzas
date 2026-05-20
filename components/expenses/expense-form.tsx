"use client";

import React, { useState, useEffect, useRef } from "react";
import { Expense } from "@/types";
import { useTheme } from "@/providers/theme-provider";
import { CATEGORIES_LIST, getCategoryEmoji } from "@/lib/constants";
import { ChevronDown, Check, Plus, Save, Edit3 } from "lucide-react";
import { CategoryBudgetHint } from "@/components/expenses/category-budget-hint";

interface ExpenseFormProps {
  editingExpense: Expense | null;
  onSave: (payload: {
    title: string;
    amount: number;
    category: string;
    type: "recurrent" | "one-time";
    status: "pending" | "paid";
    due_date: string | null;
  }) => Promise<void>;
  onCancelEdit: () => void;
}

export function ExpenseForm({
  editingExpense,
  onSave,
  onCancelEdit,
}: ExpenseFormProps) {
  const { theme } = useTheme();

  // Form fields state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Comida");
  const [status, setStatus] = useState<"pending" | "paid">("pending");

  // Select dropdown open states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Refs for click outside
  const categoryRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory("Comida");
    setStatus("pending");
  };

  // Populate form if editing
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setStatus(editingExpense.status);
    } else {
      resetForm();
    }
  }, [editingExpense]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAmountBlur = () => {
    if (amount) {
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        setAmount(parsed.toFixed(2));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      alert("Por favor ingresa el concepto y el monto.");
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert("Monto inválido.");
      return;
    }

    const statusToSave: "pending" | "paid" = editingExpense ? status : "pending";

    await onSave({
      title,
      amount: val,
      category,
      type: "recurrent",
      status: statusToSave,
      due_date: null,
    });

    if (!editingExpense) {
      resetForm();
    }
  };

  return (
    <div className={`border rounded-3xl p-6 shadow-xl space-y-6 ${
      theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-500/5 text-slate-500 border border-slate-500/10">
            {editingExpense ? <Edit3 className="w-5 h-5 animate-pulse" /> : <Plus className="w-5 h-5" />}
          </div>
          <h3 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
            {editingExpense ? "Editar Gasto Seleccionado" : "Registrar Egresos"}
          </h3>
        </div>

        {editingExpense && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Concepto</label>
          <input
            type="text"
            placeholder="Ej. Suscripción Netflix, Alquiler..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full border rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:outline-none transition ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600 focus:border-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-450"
            }`}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Monto ($)</label>
          <input
            type="number"
            step="any"
            placeholder="Monto total en COP..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={handleAmountBlur}
            className={`w-full border rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:outline-none transition ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600 focus:border-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-450"
            }`}
          />
        </div>

        {/* Custom Category Select */}
        <div ref={categoryRef} className="relative">
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Categoría</label>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className={`w-full border rounded-xl py-2.5 px-3.5 text-sm text-left flex justify-between items-center transition font-semibold cursor-pointer focus:outline-none ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white focus:border-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-450"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{getCategoryEmoji(category)}</span>
              <span>{category}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wide bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                Seleccionada
              </span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
          </button>

          {isCategoryOpen && (
            <div className={`absolute z-50 mt-1 w-full border rounded-xl shadow-2xl p-1.5 max-h-60 overflow-y-auto ${
              theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              {CATEGORIES_LIST.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setCategory(cat.name);
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-left transition ${
                    category === cat.name
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-300/80 shadow-lg shadow-indigo-500/25"
                      : theme === "dark" ? "text-slate-300 hover:bg-slate-800/60" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </span>
                  {category === cat.name && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {category !== "Ingresos" && (
          <CategoryBudgetHint
            category={category}
            amount={parseFloat(amount) || 0}
          />
        )}

        <div className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
          theme === "dark"
            ? "bg-slate-950/60 border-slate-800 text-slate-300"
            : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          Tipo de gasto fijo para esta vista: <span className="font-black">Mensual Recurrente</span>.
        </div>

        {!editingExpense && (
          <div className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
            theme === "dark"
              ? "bg-slate-950/60 border-slate-800 text-slate-300"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
            Estado inicial automático: <span className="font-black">Pendiente</span>. El pago se registra en <span className="font-black">Cronograma de Pagos</span>.
          </div>
        )}

        <button
          type="submit"
          className={`w-full font-bold py-3.5 px-4 rounded-xl transition shadow-md cursor-pointer text-sm mt-2 flex items-center justify-center gap-1.5 ${
            theme === "dark"
              ? "bg-slate-100 hover:bg-slate-200 text-slate-950 shadow-slate-950/50"
              : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
          }`}
        >
          {editingExpense ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{editingExpense ? "Guardar Cambios" : "Agregar Transacción"}</span>
        </button>
      </form>
    </div>
  );
}
