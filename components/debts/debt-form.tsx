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
import { DatePicker } from "@/components/ui/date-picker";
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
  }) => Promise<void>;
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
  const [dueDate, setDueDate] = useState("");
  const [installments, setInstallments] = useState("1");
  const [startMonth, setStartMonth] = useState("");
  const [autoCalculate, setAutoCalculate] = useState(false);

  const currentMonthValue = getCurrentMonthValue();
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
      setDueDate(editingDebt.due_date || "");
      setInstallments(editingDebt.installments?.toString() || "1");
      setStartMonth(editingDebt.start_month || "");
      setAutoCalculate(false);
    } else {
      resetForm();
    }
  }, [editingDebt, currentMonthValue]);

  // Auto-calculate minimum payment when installments change
  useEffect(() => {
    if (autoCalculate && installments && typeof remainingAmount === 'number') {
      const numInstallments = parseInt(installments);
      if (numInstallments > 0 && remainingAmount > 0) {
        const calculated = remainingAmount / numInstallments;
        setMinimumPayment(calculated);
      }
    }
  }, [installments, remainingAmount, autoCalculate]);

  useEffect(() => {
    if (dueDate && dueDate < minDueDate) {
      setDueDate(minDueDate);
    }
  }, [dueDate, minDueDate]);

  const resetForm = () => {
    setTitle("");
    setTotalAmount("");
    setRemainingAmount("");
    setMinimumPayment("");
    setDueDate("");
    setInstallments("1");
    setStartMonth("");
    setAutoCalculate(false);
  };

  const handleInstallmentsChange = (value: string) => {
    setInstallments(value);
    if (value && typeof remainingAmount === 'number') {
      setAutoCalculate(true);
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
    if (dueDate && dueDate < minDueDate) {
      toast.error("La fecha de vencimiento debe ser igual o posterior al mes base seleccionado.");
      return;
    }

    await onSave({
      title,
      total_amount: total,
      remaining_amount: remaining,
      minimum_payment: minimum,
      due_date: dueDate || null,
      installments: normalizedInstallments,
      start_month: startMonth || null,
    });

    if (!editingDebt) {
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
            Monto Inicial Prestado
          </label>
          <CurrencyInput
            value={totalAmount === "" ? undefined : totalAmount}
            onChange={(val) => setTotalAmount(val)}
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

        {/* Installments */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Número de Cuotas
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="Ej. 12, 24, 36..."
              value={installments}
              onChange={(e) => handleInstallmentsChange(e.target.value)}
              onBlur={() => {
                if (!installments || Number(installments) <= 0) {
                  setInstallments("1");
                }
              }}
              onFocus={(e) => e.target.select()}
              className={inputClass}
            />
            {installments && remainingAmount && (
              <div className="shrink-0 flex items-center gap-1 text-xs text-emerald-500 font-bold">
                <Calculator className="w-3.5 h-3.5" />
                <span>Auto</span>
              </div>
            )}
          </div>
          {installments && typeof remainingAmount === "number" && (
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Cuota calculada:{" "}
              {(remainingAmount / parseInt(installments || "1")).toLocaleString(
                "es-CO",
                {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                },
              )}
              /mes
            </p>
          )}
        </div>

        {/* Minimum Payment */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Pago Mínimo Mensual
          </label>
          <CurrencyInput
            value={minimumPayment === "" ? undefined : minimumPayment}
            onChange={(val) => {
              setMinimumPayment(val);
              setAutoCalculate(false);
            }}
            placeholder="Cuota fija o amortización mínima..."
            className={inputClass}
          />
        </div>

        {/* Start Month */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Mes de Inicio de Cuotas
          </label>
          <Select
            value={startMonth}
            onValueChange={(val) =>
              setStartMonth(val === "__default__" ? "" : val)
            }
          >
            <SelectTrigger
              className={`w-full h-10 rounded-xl ${
                theme === "dark"
                  ? "bg-slate-950/80 border-slate-800 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <SelectValue placeholder="Usar fecha de creación (por defecto)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">
                Usar fecha de creación (por defecto)
              </SelectItem>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label} {month.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!startMonth && (
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Si no se especifica, se usará la fecha de creación de la deuda.
            </p>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
            Fecha de Vencimiento (Opcional)
          </label>
          <DatePicker
            value={dueDate || null}
            onChange={(value) => setDueDate(value || "")}
            minDate={minDueDate}
            placeholder="Seleccionar fecha de vencimiento"
            className={`w-full h-10 justify-start rounded-xl px-3.5 text-sm font-semibold ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white hover:bg-slate-900"
                : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100"
            }`}
          />
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
