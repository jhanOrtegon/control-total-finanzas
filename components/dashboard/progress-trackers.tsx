"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";

interface ProgressTrackersProps {
  monthlyIncome: number;
  monthlyDebtMinimums: number;
  totalOutstandingDebt: number;
  totalInitialDebt: number;
}

export function ProgressTrackers({
  monthlyIncome,
  monthlyDebtMinimums,
  totalOutstandingDebt,
  totalInitialDebt,
}: ProgressTrackersProps) {
  const { theme } = useTheme();

  // DTI calculation
  const dtiRatio = monthlyIncome > 0 ? (monthlyDebtMinimums / monthlyIncome) * 100 : 0;
  
  let dtiLevel: "healthy" | "warning" | "critical" = "healthy";
  if (dtiRatio > 36) {
    dtiLevel = "critical";
  } else if (dtiRatio >= 20) {
    dtiLevel = "warning";
  }

  // Debt progress
  const totalPaidOffDebt = totalInitialDebt - totalOutstandingDebt;
  const debtRepaymentProgress = totalInitialDebt > 0 ? (totalPaidOffDebt / totalInitialDebt) * 100 : 0;

  return (
    <div className={`border rounded-3xl p-6 shadow-xl space-y-6 ${
      theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/80"
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* DTI (Debt-to-Income) Monitor */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-bold text-slate-500">Relación Deuda-Ingreso (DTI)</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Porcentaje de ingresos destinado a pagar cuotas mínimas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                dtiLevel === "critical"
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  : dtiLevel === "warning"
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              }`}>
                {dtiLevel === "critical" && "DTI Crítico (Riesgo Alto)"}
                {dtiLevel === "warning" && "DTI Moderado"}
                {dtiLevel === "healthy" && "DTI Saludable"}
              </span>
              <span className="text-sm font-black">{dtiRatio.toFixed(1)}%</span>
            </div>
          </div>

          <div className={`w-full rounded-full h-4 overflow-hidden p-0.5 ${theme === "dark" ? "bg-slate-950 border border-slate-900" : "bg-slate-100 border border-slate-200"}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                dtiLevel === "critical"
                  ? "bg-rose-500 dark:bg-rose-600"
                  : dtiLevel === "warning"
                  ? "bg-amber-500 dark:bg-amber-600"
                  : "bg-emerald-500 dark:bg-emerald-600"
              }`}
              style={{ width: `${Math.min(dtiRatio, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Debt Payoff Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-bold text-slate-500">Progreso Total de Pago de Deudas</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Dinero pagado vs Deuda total inicial</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-black">
              <span>{debtRepaymentProgress.toFixed(1)}%</span>
            </div>
          </div>

          <div className={`w-full rounded-full h-4 overflow-hidden p-0.5 ${theme === "dark" ? "bg-slate-950 border border-slate-900" : "bg-slate-100 border border-slate-200"}`}>
            <div
              className="h-full rounded-full transition-all duration-500 bg-indigo-500 dark:bg-indigo-600"
              style={{ width: `${Math.min(debtRepaymentProgress, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* DTI Critical Warning Alert */}
      {dtiLevel === "critical" && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-3 mt-4">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <span className="font-bold block">¡Advertencia de Alto Sobreendeudamiento!</span>
            <span className="block mt-0.5 font-semibold text-rose-400/90 leading-relaxed">
              Tu DTI supera el 36%. Destinar más de un tercio de tus ingresos a deudas fijas es insostenible a largo plazo. Te aconsejamos usar el método "Bola de Nieve" o "Avalancha" en la pestaña "Mis Deudas Activas" para liquidar tus saldos rápidamente.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
