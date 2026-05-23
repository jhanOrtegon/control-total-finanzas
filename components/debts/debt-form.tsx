"use client";

import React, { useState, useEffect } from "react";
import { Debt } from "@/types";
import { useTheme } from "@/providers/theme-provider";
import { Plus, Save, Edit3, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";

interface DebtFormProps {
  editingDebt: Debt | null;
  onSave: (payload: {
    title: string;
    total_amount: number;
    remaining_amount: number;
    minimum_payment: number;
    due_date: string | null;
    installments: number;
    start_month: string | null;
  }) => Promise<boolean | void>;
  onCancelEdit: () => void;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const getCurrentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export function DebtForm({
  editingDebt,
  onSave,
  onCancelEdit,
}: DebtFormProps) {
  const { theme } = useTheme();

  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [remainingAmount, setRemainingAmount] = useState<number | "">("");
  const [minimumPayment, setMinimumPayment] = useState<number | "">("");
  const [dueDateDay, setDueDateDay] = useState("15");
  const [installments, setInstallments] = useState("1");
  const currentMonthValue = getCurrentMonthValue();
  const [startMonth, setStartMonth] = useState(currentMonthValue);
  const [calcMode, setCalcMode] = useState<"installments" | "payment">("installments");

  const baseDueMonth = startMonth || currentMonthValue;

  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const now = new Date();
    const monthIndex = (now.getMonth() + index) % 12;
    const yearOffset = now.getMonth() + index >= 12 ? 1 : 0;
    const year = now.getFullYear() + yearOffset;
    return {
      label: MONTHS[monthIndex],
      value: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      year,
    };
  });

  const minDueDate = `${baseDueMonth}-01`;

  useEffect(() => {
    if (editingDebt) {
      setTitle(editingDebt.title);
      setTotalAmount(editingDebt.total_amount);
      setRemainingAmount(editingDebt.remaining_amount);
      setMinimumPayment(editingDebt.minimum_payment);
      setDueDateDay(editingDebt.due_date ? editingDebt.due_date.split("-")[2] || "15" : "15");
      setInstallments(editingDebt.installments?.toString() || "1");
      setStartMonth(editingDebt.start_month || currentMonthValue);
      setCalcMode("installments");
    } else {
      resetForm();
    }
  }, [editingDebt, currentMonthValue]);

  // Bidirectional auto-calculation
  useEffect(() => {
    if (typeof remainingAmount === "number" && remainingAmount > 0) {
      if (calcMode === "installments") {
        const inst = Math.max(1, parseInt(installments) || 1);
        setMinimumPayment(remainingAmount / inst);
      } else if (calcMode === "payment") {
        if (typeof minimumPayment === "number" && minimumPayment > 0) {
          const inst = Math.max(1, Math.ceil(remainingAmount / minimumPayment));
          setInstallments(inst.toString());
        }
      }
    }
  }, [remainingAmount, installments, minimumPayment, calcMode]);

  const resetForm = () => {
    setTitle("");
    setTotalAmount("");
    setRemainingAmount("");
    setMinimumPayment("");
    setDueDateDay("15");
    setInstallments("1");
    setStartMonth(currentMonthValue);
    setCalcMode("installments");
  };

  const handleTotalAmountChange = (val: number | "") => {
    setTotalAmount(val);
    // Auto-fill remaining amount if it's empty or equals the previous total amount
    if (val !== "" && (remainingAmount === "" || remainingAmount === totalAmount)) {
      setRemainingAmount(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || totalAmount === "" || remainingAmount === "") return;
    const total = totalAmount as number;
    const remaining = remainingAmount as number;
    const minimum = (minimumPayment as number) || 0;
    const normalizedInstallments = Math.max(1, parseInt(installments || "1"));

    if (isNaN(total) || total <= 0 || isNaN(remaining) || remaining < 0) return;
    if (remaining > total) return;
    const dDay = parseInt(dueDateDay, 10);
    if (isNaN(dDay) || dDay < 1 || dDay > 31) {
      toast.error("Por favor, ingresa un día de vencimiento válido (1-31).");
      return;
    }
    const dayPad = dDay < 10 ? `0${dDay}` : dDay;
    const computedDueDate = `${baseDueMonth}-${dayPad}`;

    const success = await onSave({
      title,
      total_amount: total,
      remaining_amount: remaining,
      minimum_payment: minimum,
      due_date: computedDueDate,
      installments: normalizedInstallments,
      start_month: startMonth || null,
    });

    if (success !== false && !editingDebt) {
      resetForm();
    }
  };

  const inputClass = `w-full border rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:outline-none transition ${
    theme === "dark"
      ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600 focus:border-slate-400"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-450"
  }`;

  return (
    <div
      className={`border rounded-3xl p-6 shadow-xl space-y-6 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-500/5 text-slate-500 border border-slate-500/10">
            {editingDebt ? (
              <Edit3 className="w-5 h-5 animate-pulse" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </div>
          <h3
            className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-950"}`}
          >
            {editingDebt ? "Modificar Deuda" : "Registrar Nueva Deuda"}
          </h3>
        </div>
        {editingDebt && (
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
        {/* Debt Title */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Entidad o Nombre
          </label>
          <input
            type="text"
            placeholder="Ej. Tarjeta Visa, Crédito Hipotecario..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Total Amount */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Monto Inicial
          </label>
          <CurrencyInput
            value={totalAmount === "" ? undefined : totalAmount}
            onChange={handleTotalAmountChange}
            placeholder="Monto total original..."
            className={inputClass}
          />
        </div>

        {/* Remaining Amount */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Saldo Restante Actual
          </label>
          <CurrencyInput
            value={remainingAmount === "" ? undefined : remainingAmount}
            onChange={(val) => setRemainingAmount(val)}
            placeholder="Monto pendiente hoy..."
            className={inputClass}
          />
        </div>

        {/* Payment Strategy Block */}
        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              Estrategia de Amortización
            </label>
            <div className="flex bg-slate-200/50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCalcMode("installments")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  calcMode === "installments"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Fijar N° Cuotas
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("payment")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  calcMode === "payment"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Fijar Cuota Fija
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Installments */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                N° de Cuotas
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                disabled={calcMode === "payment"}
                placeholder="Ej. 12, 24..."
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                onBlur={() => {
                  if (!installments || Number(installments) <= 0) setInstallments("1");
                }}
                onFocus={(e) => e.target.select()}
                className={`${inputClass} ${calcMode === "payment" ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-950/40" : ""}`}
              />
            </div>

            {/* Minimum Payment */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                Cuota Mensual
              </label>
              <CurrencyInput
                disabled={calcMode === "installments"}
                value={minimumPayment === "" ? undefined : minimumPayment}
                onChange={(val) => setMinimumPayment(val)}
                placeholder="0"
                className={`${inputClass} ${calcMode === "installments" ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-950/40" : ""}`}
              />
            </div>
          </div>
        </div>

        {/* Start Month */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Mes de Inicio de Cuotas
          </label>
          <Select
            value={startMonth}
            onValueChange={(val) => setStartMonth(val || currentMonthValue)}
          >
            <SelectTrigger
              className={`w-full h-10 rounded-xl ${
                theme === "dark"
                  ? "bg-slate-950/80 border-slate-800 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <SelectValue placeholder="Mes de inicio" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label} {month.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Día de Vencimiento Mensual
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={dueDateDay}
            onChange={(e) => setDueDateDay(e.target.value)}
            required
            className={inputClass}
          />
          <p className="text-[10px] text-slate-500 mt-1 font-medium">
            Día del mes en que se debe pagar la cuota (por defecto el 15).
          </p>
        </div>

        <button
          type="submit"
          className={`w-full font-bold py-3.5 px-4 rounded-xl transition shadow-md cursor-pointer text-sm mt-2 flex items-center justify-center gap-1.5 ${
            theme === "dark"
              ? "bg-slate-100 hover:bg-slate-200 text-slate-950 shadow-slate-950/50"
              : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
          }`}
        >
          {editingDebt ? (
            <Save className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{editingDebt ? "Guardar Cambios" : "Agregar Deuda"}</span>
        </button>
      </form>
    </div>
  );
}
