"use client";

import React, { useMemo } from "react";
import { PiggyBank } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { formatCurrency } from "@/lib/utils";
import { computeMonthlySummary } from "@/lib/finance-calculations";

export function SavingsGoalCard() {
  const { budget, expenses, debts } = useFinance();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const summary = useMemo(
    () => computeMonthlySummary(budget, expenses, debts, currentMonth, currentYear),
    [budget, expenses, debts, currentMonth, currentYear]
  );

  const savingsGoal = summary.savingsGoal;
  const realAvailableCash = summary.realAvailableCash;

  // Percentage: how much of savingsGoal is covered by realAvailableCash
  const percentage = savingsGoal > 0
    ? Math.min(100, Math.max(0, (realAvailableCash / savingsGoal) * 100))
    : 0;

  // SVG circle math: circumference = 2 * π * r = 2 * π * 38 ≈ 238.76
  const CIRCUMFERENCE = 238.76;
  const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * percentage) / 100;

  const motivationalMessage =
    realAvailableCash >= savingsGoal
      ? "🎯 ¡Meta alcanzable este mes!"
      : realAvailableCash > 0
        ? "💪 Estás en camino"
        : "⚠️ Revisa tus gastos";

  return (
    <section className="border rounded-3xl p-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      {/* Title */}
      <h3 className="text-base font-black flex items-center gap-2 mb-5">
        <PiggyBank className="w-5 h-5 text-emerald-500" />
        Meta de Ahorro
      </h3>

      {/* Circular ring */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Track circle */}
            <circle
              cx="50"
              cy="50"
              r="38"
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="38"
              className="stroke-emerald-500 transition-all duration-700"
              strokeWidth="8"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          {/* Center label */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
              {percentage.toFixed(0)}%
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              cubierto
            </span>
          </div>
        </div>

        {/* Stats rows */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">Meta mensual</span>
            <span className="font-black text-emerald-500">
              {formatCurrency(savingsGoal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">Disponible real</span>
            <span
              className={`font-black ${
                realAvailableCash >= 0 ? "text-green-500" : "text-rose-500"
              }`}
            >
              {formatCurrency(realAvailableCash)}
            </span>
          </div>
        </div>

        {/* Motivational badge */}
        <div
          className={`w-full text-center px-3 py-2 rounded-2xl text-xs font-bold ${
            realAvailableCash >= savingsGoal
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : realAvailableCash > 0
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {motivationalMessage}
        </div>
      </div>
    </section>
  );
}
