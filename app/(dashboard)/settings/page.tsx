"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useBudget } from "@/hooks/use-budget";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const { budget, updateBudget, loading } = useBudget(user?.id);

  const [income, setIncome] = useState<string>("");
  const [savingsGoal, setSavingsGoal] = useState<string>("");
  const [budgetLimit, setBudgetLimit] = useState<string>("");

  // Sync inputs with budget data
  useEffect(() => {
    if (budget) {
      setIncome(budget.monthly_income > 0 ? budget.monthly_income.toString() : "");
      setSavingsGoal(budget.monthly_savings_goal > 0 ? budget.monthly_savings_goal.toString() : "");
      setBudgetLimit(budget.monthly_budget > 0 ? budget.monthly_budget.toString() : "");
    }
  }, [budget]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const incVal = parseFloat(income) || 0;
    const savVal = parseFloat(savingsGoal) || 0;
    const budVal = parseFloat(budgetLimit) || 0;

    if (incVal < 0 || savVal < 0 || budVal < 0) {
      toast.error("Los valores no pueden ser negativos.");
      return;
    }

    const success = await updateBudget(incVal, budVal, savVal);
    if (success) {
      // Handled by custom hook's toast
    }
  };

  return (
    <section className="border rounded-3xl p-8 max-w-2xl mx-auto shadow-xl space-y-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <h2 className="text-lg font-black flex items-center gap-2">
        <Settings className="w-6 h-6 text-indigo-500" />
        <span>Configuración de Parámetros de Libertad Financiera</span>
      </h2>
      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
        Establece con honestidad tus ingresos reales mensuales y tus objetivos de ahorro. Con estos datos calcularemos tus índices de sobreendeudamiento (DTI) y flujo de caja libre para sacarte del saldo negativo.
      </p>

      <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Ingresos Mensuales Propios
          </label>
          <input
            type="number"
            step="any"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full border rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Meta de Ahorro Mensual
          </label>
          <input
            type="number"
            step="any"
            value={savingsGoal}
            onChange={(e) => setSavingsGoal(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full border rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Presupuesto Límite de Gasto
          </label>
          <input
            type="number"
            step="any"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full border rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? "Guardando..." : "Guardar Parámetros de Planificación"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
