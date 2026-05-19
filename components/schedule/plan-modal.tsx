"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { CATEGORIES_LIST } from "@/lib/constants";
import { Debt } from "@/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: number;
  selectedYear: number;
  debts: Debt[];
  addExpense: (payload: any) => Promise<any>;
  theme: string;
}

export function PlanModal({
  isOpen,
  onClose,
  selectedMonth,
  selectedYear,
  debts,
  addExpense,
  theme,
}: PlanModalProps) {
  const [type, setType] = useState<"income" | "expense" | "debt">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Otros");
  const [selectedDebtId, setSelectedDebtId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error("Por favor, ingresa un monto válido.");
      return;
    }

    if (!title.trim() && type !== "debt") {
      toast.error("Por favor, ingresa un título descriptivo.");
      return;
    }

    const pad = selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth;
    const formattedDate = `${selectedYear}-${pad}-15`;

    let payload: any = {
      amount: val,
      type: "one-time" as const,
      due_date: formattedDate,
    };

    if (type === "income") {
      payload.title = title;
      payload.category = "Ingresos";
      payload.status = "paid" as const; // default incomes to paid/received
    } else if (type === "expense") {
      payload.title = title;
      payload.category = category;
      payload.status = "pending" as const;
    } else {
      // debt type
      const targetDebt = debts.find((d) => d.id === selectedDebtId);
      if (!targetDebt) {
        toast.error("Por favor, selecciona una deuda activa.");
        return;
      }
      payload.title = `Abono a deuda: ${targetDebt.title}`;
      payload.category = "Otros";
      payload.status = "pending" as const;
    }

    const success = await addExpense(payload);
    if (success) {
      toast.success(
        type === "income"
          ? "Ingreso planificado correctamente."
          : type === "debt"
          ? "Pago de deuda asignado correctamente."
          : "Gasto planificado correctamente."
      );
      // Reset form states
      setTitle("");
      setAmount("");
      setCategory("Otros");
      setSelectedDebtId("");
      onClose();
    }
  };

  const handleAmountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Filter categories to exclude "Ingresos" for expense creation
  const filteredCategories = CATEGORIES_LIST.filter((c) => c.name !== "Ingresos");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`w-full max-w-md rounded-3xl p-6 sm:max-w-md ${
        theme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200"
      }`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            Planificar Transacción
          </DialogTitle>
          <DialogDescription className="text-[11px] font-semibold text-slate-400">
            Asigna al mes de {selectedMonth}/{selectedYear}
          </DialogDescription>
        </DialogHeader>

        {/* Type Selectors */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
          {(["expense", "income", "debt"] as const).map((t) => {
            const label = t === "expense" ? "Gasto" : t === "income" ? "Ingreso" : "Deuda";
            const isSelected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  isSelected
                    ? theme === "dark" ? "bg-white text-slate-950 shadow-sm" : "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title field (Hidden for debt as it auto-populates) */}
          {type !== "debt" ? (
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Título / Descripción
              </label>
              <input
                type="text"
                placeholder={type === "income" ? "Ej. Sueldo Extra, Bono..." : "Ej. Compra de Ropa, Arriendo..."}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={`w-full border rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none transition ${
                  theme === "dark"
                    ? "bg-slate-950/80 border-slate-800 text-white focus:border-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-450"
                }`}
              />
            </div>
          ) : (
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Seleccionar Deuda Activa
              </label>
              <Select
                value={selectedDebtId || "__none__"}
                onValueChange={(value) =>
                  setSelectedDebtId(!value || value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger className={`w-full h-10 rounded-xl text-xs font-semibold ${
                  theme === "dark"
                    ? "bg-slate-950/80 border-slate-800 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}>
                  <SelectValue placeholder="Selecciona una deuda..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Selecciona una deuda --</SelectItem>
                  {debts.filter((d) => d.remaining_amount > 0).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title} (Faltan: ${d.remaining_amount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount field */}
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Monto / Valor ($)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={handleAmountFocus}
              required
              className={`w-full border rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none transition ${
                theme === "dark"
                  ? "bg-slate-950/80 border-slate-800 text-white focus:border-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-450"
              }`}
            />
          </div>

          {/* Category Select (Only for generic expenses) */}
          {type === "expense" && (
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Categoría del Gasto
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {filteredCategories.map((c) => {
                  const isSelected = category === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setCategory(c.name)}
                      className={`py-1.5 rounded-xl border text-[9px] font-bold text-center transition cursor-pointer ${
                        isSelected
                          ? theme === "dark" ? "bg-indigo-550 border-indigo-650 text-white" : "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold shadow-sm"
                          : theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-xs mb-0.5">{c.emoji}</span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
