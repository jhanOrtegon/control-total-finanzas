"use client";

import React, { useState } from "react";
import { Sparkles, Info, ShieldAlert } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { DeficitSolverDialog } from "./deficit-solver-dialog";

interface HealthAdvisorProps {
  monthlyIncome: number;
  monthlyBudget: number;
  monthlySavingsGoal: number;
  totalSpent: number;
  realAvailableCash: number;
}

export function HealthAdvisor({
  monthlyIncome,
  monthlyBudget,
  monthlySavingsGoal,
  totalSpent,
  realAvailableCash,
}: HealthAdvisorProps) {
  const { theme } = useTheme();
  const [showSolver, setShowSolver] = useState(false);

  const budgetPercentage = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  const isHealthy = realAvailableCash >= 0;

  return (
    <div className={`border rounded-3xl p-6 space-y-6 ${
      theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/80"
    }`}>
      <h3 className="text-base font-black flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-slate-500" />
        <span>Diagnóstico Financiero Personal</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Límite Gasto Mensual</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold">{formatCurrency(monthlyBudget)}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              budgetPercentage <= 100
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
            }`}>
              {budgetPercentage.toFixed(0)}% Utilizado
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ahorro Mensual Proyectado</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold">{formatCurrency(monthlySavingsGoal)}</span>
            <span className="text-xs font-semibold text-slate-400">Objetivo Fijo</span>
          </div>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border leading-relaxed space-y-2 ${
        isHealthy
          ? theme === "dark"
            ? "bg-slate-950 border-slate-800 text-slate-300"
            : "bg-slate-50 border-slate-200 text-slate-800"
          : theme === "dark"
          ? "bg-rose-950/20 border-rose-900/50 text-rose-300"
          : "bg-rose-50 border-rose-100 text-rose-800"
      }`}>
        <h4 className="text-sm font-black flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Recomendación Financiera</span>
        </h4>
        {isHealthy ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tus finanzas se mantienen en balance positivo. Tienes un remanente proyectado de <strong className="text-emerald-500">{formatCurrency(realAvailableCash)}</strong> libres este mes. Te aconsejamos usar este excedente para realizar abonos extraordinarios a tus deudas activas o puedes aplazar pagos usando el asistente.
            </p>
            <button
              onClick={() => setShowSolver(true)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Asistente de Rescate Financiero
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-rose-400/90">
              ⚠️ ¡Peligro de Déficit! Tu flujo de caja real proyectado se encuentra en negativo por un valor de <strong>{formatCurrency(Math.abs(realAvailableCash))}</strong>.
            </p>
            <button
              onClick={() => setShowSolver(true)}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2 px-4 rounded-xl transition cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              Asistente de Rescate Financiero
            </button>
          </div>
        )}
      </div>

      <DeficitSolverDialog
        open={showSolver}
        onOpenChange={setShowSolver}
        deficitAmount={Math.abs(realAvailableCash)}
      />
    </div>
  );
}
