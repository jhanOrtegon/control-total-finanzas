"use client";

import React, { useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { Coins, X } from "lucide-react";

interface PaymentDialogProps {
  debtTitle: string;
  maxAmount: number;
  onConfirm: (amount: number) => Promise<void>;
  onClose: () => void;
}

export function PaymentDialog({
  debtTitle,
  maxAmount,
  onConfirm,
  onClose,
}: PaymentDialogProps) {
  const { theme } = useTheme();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert("Ingresa un monto de abono válido mayor a 0.");
      return;
    }
    if (val > maxAmount) {
      alert("El abono no puede ser mayor que el saldo restante de la deuda.");
      return;
    }

    setLoading(true);
    await onConfirm(val);
    setLoading(false);
    onClose();
  };

  return (
    <div className={`p-6 border rounded-2xl border-indigo-500 shadow-xl ${
      theme === "dark" ? "bg-slate-900" : "bg-white"
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold flex items-center gap-1.5 text-sm">
          <Coins className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Registrar Abono Extraordinario: {debtTitle}</span>
        </h4>
        <button
          onClick={onClose}
          disabled={loading}
          className="text-slate-500 hover:text-slate-300 focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            Monto a abonar (COP)
          </label>
          <input
            type="number"
            placeholder="Ej. 150000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            className={`w-full border rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500 text-xs font-semibold ${
              theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
        >
          {loading ? "Registrando..." : "Confirmar Pago"}
        </button>
      </form>
    </div>
  );
}
