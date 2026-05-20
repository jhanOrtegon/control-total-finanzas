"use client";

import React, { useState, useEffect } from "react";
import { useFinance } from "@/providers/finance-provider";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";
import { CurrencyInput } from "@/components/ui/currency-input";

export default function SettingsPage() {
  const { budget, updateBudget, budgetLoading: loading } = useFinance();

  const [income, setIncome] = useState<number | "">("");
  const [savingsGoal, setSavingsGoal] = useState<number | "">("");
  const [budgetLimit, setBudgetLimit] = useState<number | "">("");

  // Sync inputs with budget data
  useEffect(() => {
    if (budget) {
      setIncome(budget.monthly_income > 0 ? budget.monthly_income : "");
      setSavingsGoal(budget.monthly_savings_goal > 0 ? budget.monthly_savings_goal : "");
      setBudgetLimit(budget.monthly_budget > 0 ? budget.monthly_budget : "");
    }
  }, [budget]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const incVal = (income as number) || 0;
    const savVal = (savingsGoal as number) || 0;
    const budVal = (budgetLimit as number) || 0;

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
    <div className="max-w-2xl mx-auto space-y-6">
    <PoolBalanceBanner />
    <section className="border rounded-3xl p-8 shadow-xl space-y-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
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
          <CurrencyInput
            value={income === "" ? undefined : income}
            onChange={(val) => setIncome(val)}
            className="w-full border rounded-xl py-3 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Meta de Ahorro Mensual
          </label>
          <CurrencyInput
            value={savingsGoal === "" ? undefined : savingsGoal}
            onChange={(val) => setSavingsGoal(val)}
            className="w-full border rounded-xl py-3 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            Presupuesto Límite de Gasto
          </label>
          <CurrencyInput
            value={budgetLimit === "" ? undefined : budgetLimit}
            onChange={(val) => setBudgetLimit(val)}
            className="w-full border rounded-xl py-3 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
    </div>
  );
}
