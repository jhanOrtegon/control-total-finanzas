"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useBudget } from "@/hooks/use-budget";
import { useExpenses } from "@/hooks/use-expenses";
import { useDebts } from "@/hooks/use-debts";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { 
  Sparkles, 
  TrendingUp, 
  Flame, 
  Snowflake, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  HelpCircle,
  PiggyBank,
  HelpCircle as InfoIcon
} from "lucide-react";

export default function AdvisorPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Load user data
  const { budget } = useBudget(user?.id);
  const { expenses } = useExpenses(user?.id);
  const { debts } = useDebts(user?.id);

  // States
  const [selectedRule, setSelectedRule] = useState<"503020" | "7030" | "6040">("503020");
  const [extraPaymentInput, setExtraPaymentInput] = useState<string>("200000"); // default extra abono COP

  // Data computations
  const income = budget?.monthly_income || 0;
  const savingsGoal = budget?.monthly_savings_goal || 0;
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyDebtMinimums = debts.reduce((acc, curr) => acc + curr.minimum_payment, 0);
  const realAvailableCash = income - totalSpent - savingsGoal - monthlyDebtMinimums;
  
  // Recurrent templates amount
  const recurrentTotal = expenses
    .filter((e) => e.type === "recurrent")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Variable expenses in database (exclude abonos/debts and recurrent)
  const recurrentTitles = expenses.filter(e => e.type === "recurrent").map(e => e.title.toLowerCase());
  const variableSpent = expenses
    .filter(
      (e) =>
        e.type === "one-time" &&
        !e.title.toLowerCase().startsWith("abono a deuda:") &&
        !recurrentTitles.includes(e.title.toLowerCase())
    )
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Fixed Costs (Needs) = Recurrent templates + Debt minimums
  const actualNeeds = recurrentTotal + monthlyDebtMinimums;
  // Wants (Deseos) = Variable actual spent
  const actualWants = variableSpent;
  // Savings (Ahorro/Inversion) = Savings goal
  const actualSavings = savingsGoal;

  // Percentages relative to income
  const totalAllocated = actualNeeds + actualWants + actualSavings;
  const needsPct = income > 0 ? (actualNeeds / income) * 100 : 0;
  const wantsPct = income > 0 ? (actualWants / income) * 100 : 0;
  const savingsPct = income > 0 ? (actualSavings / income) * 100 : 0;

  // Selected Budgeting Rule settings
  const getRuleDetails = () => {
    switch (selectedRule) {
      case "7030":
        return {
          name: "Regla 70/30 (Enfoque de Amortización)",
          desc: "Diseñada para economías con alto nivel de deudas o costos fijos. Destina el 70% a gastos fijos, deudas y estilo de vida, y el 30% restante al ahorro y pago extraordinario de pasivos.",
          targetNeeds: 70,
          targetWants: 0, // combined
          targetSavings: 30,
        };
      case "6040":
        return {
          name: "Regla de Harvard (60/40)",
          desc: "Divide los ingresos en 60% para costos fijos de vida, y un 40% que se distribuye de manera equitativa entre metas de inversión, pago de deudas y diversión de manera estricta.",
          targetNeeds: 60,
          targetWants: 20,
          targetSavings: 20,
        };
      case "503020":
      default:
        return {
          name: "Regla Clásica 50/30/20",
          desc: "El estándar de oro de las finanzas personales. Destina 50% a tus necesidades básicas y compromisos de deuda fijos, 30% a tus deseos o recreación, y un 20% obligatorio a tu meta de ahorro futuro.",
          targetNeeds: 50,
          targetWants: 30,
          targetSavings: 20,
        };
    }
  };

  const rule = getRuleDetails();

  // Active debts list
  const activeDebts = debts.filter((d) => d.remaining_amount > 0);

  // Debt Timelines simulation helper
  const simulateDebts = (method: "snowball" | "cfi", extraPay: number) => {
    if (activeDebts.length === 0) return { months: 0, steps: [] };

    // Clone debts to simulate month-by-month changes
    let simulated = activeDebts.map((d) => ({
      id: d.id,
      title: d.title,
      balance: d.remaining_amount,
      minPay: d.minimum_payment,
      cfi: d.minimum_payment > 0 ? d.remaining_amount / d.minimum_payment : 99999,
    }));

    // Sort according to method
    if (method === "snowball") {
      // Smallest balance first
      simulated.sort((a, b) => a.balance - b.balance);
    } else {
      // Lowest Cash Flow Index (CFI) first (most inefficient debt)
      simulated.sort((a, b) => a.cfi - b.cfi);
    }

    let monthsCount = 0;
    const steps: { month: number; payments: { title: string; amount: number; remaining: number }[] }[] = [];
    const maxSafetyMonths = 240; // 20 years safety limit

    while (simulated.some((d) => d.balance > 0) && monthsCount < maxSafetyMonths) {
      monthsCount++;
      let extraAllocated = extraPay;
      const currentMonthPayments: { title: string; amount: number; remaining: number }[] = [];

      // 1. Pay minimums to all active debts
      for (const d of simulated) {
        if (d.balance > 0) {
          const minToPay = Math.min(d.minPay, d.balance);
          d.balance -= minToPay;
          currentMonthPayments.push({
            title: d.title,
            amount: minToPay,
            remaining: d.balance,
          });
        }
      }

      // 2. Apply extra payment + freed minimums to the priority debt
      for (const d of simulated) {
        if (d.balance > 0) {
          if (extraAllocated > 0) {
            const extraToPay = Math.min(extraAllocated, d.balance);
            d.balance -= extraToPay;
            extraAllocated -= extraToPay;

            // Update record inside steps
            const record = currentMonthPayments.find((p) => p.title === d.title);
            if (record) {
              record.amount += extraToPay;
              record.remaining = d.balance;
            }
          }
          
          // If a debt has been paid off, its minPay is added to the extra payment pool for the next debt/month
          if (d.balance === 0) {
            extraAllocated += d.minPay;
          }
        }
      }

      steps.push({
        month: monthsCount,
        payments: currentMonthPayments,
      });
    }

    return {
      months: monthsCount,
      steps,
    };
  };

  const parsedExtra = parseFloat(extraPaymentInput) || 0;

  // Timeline with minimum payments only
  const minOnlyTimeline = simulateDebts("snowball", 0);
  // Timeline with extra payment using Snowball method
  const snowballTimeline = simulateDebts("snowball", parsedExtra);
  // Timeline with extra payment using Cash Flow Index method
  const cfiTimeline = simulateDebts("cfi", parsedExtra);

  // Optimal order reports
  const snowballOrder = [...activeDebts].sort((a, b) => a.remaining_amount - b.remaining_amount);
  const cfiOrder = [...activeDebts].sort((a, b) => {
    const cfiA = a.minimum_payment > 0 ? a.remaining_amount / a.minimum_payment : 99999;
    const cfiB = b.minimum_payment > 0 ? b.remaining_amount / b.minimum_payment : 99999;
    return cfiA - cfiB;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Overview Badges */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 border rounded-3xl shadow-md ${
          theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <PiggyBank className="w-4 h-4 text-emerald-500" />
            <span>Tasa de Ahorro Real</span>
          </div>
          <div className="text-2xl font-black">{savingsPct.toFixed(1)}%</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            {savingsPct >= 20 
              ? "✅ Excelente tasa de acumulación de capital." 
              : "⚠️ Economistas recomiendan subir el ahorro al menos al 20%."}
          </p>
        </div>

        <div className={`p-6 border rounded-3xl shadow-md ${
          theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Carga Fija Mensual</span>
          </div>
          <div className="text-2xl font-black">{needsPct.toFixed(1)}%</div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            {needsPct <= 50 
              ? "✅ Gastos rígidos bajo control." 
              : "⚠️ Tus costos fijos restan libertad para reaccionar ante imprevistos."}
          </p>
        </div>

        <div className={`p-6 border rounded-3xl shadow-md ${
          theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Diagnóstico Economista</span>
          </div>
          <div className="text-sm font-bold flex items-center gap-1.5 mt-1">
            {needsPct > 65 ? (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Sobrecarga de Costos Fijos
              </span>
            ) : realAvailableCash < 0 ? (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Flujo en Déficit Activo
              </span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Estructura Balanceada
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            Análisis de distribución de recursos según tu ingreso de {formatCurrency(income)}.
          </p>
        </div>
      </section>

      {/* Rule Analyzer Widget */}
      <section className={`p-6 border rounded-3xl shadow-xl space-y-6 ${
        theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/80"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>Simulador de Reglas Presupuestarias Académicas</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Compara tus gastos reales con los modelos de optimización propuestos por macroeconomistas.
            </p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setSelectedRule("503020")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                selectedRule === "503020"
                  ? theme === "dark" ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              50/30/20
            </button>
            <button
              onClick={() => setSelectedRule("7030")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                selectedRule === "7030"
                  ? theme === "dark" ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              70/30
            </button>
            <button
              onClick={() => setSelectedRule("6040")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                selectedRule === "6040"
                  ? theme === "dark" ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              60/40
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rule Description */}
          <div className="space-y-4 lg:border-r border-slate-200 dark:border-slate-800/80 lg:pr-8">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-indigo-500">{rule.name}</span>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">{rule.desc}</p>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 block uppercase">Distribución Recomendada:</span>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Necesidades / Fijos:</span>
                  <span>{rule.targetNeeds}%</span>
                </div>
                {rule.targetWants > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span>Deseos / Variables:</span>
                    <span>{rule.targetWants}%</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold">
                  <span>Ahorro / Amortizaciones:</span>
                  <span>{rule.targetSavings}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* User vs Rule comparison */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Tu Distribución Actual vs Objetivo</h4>
            
            <div className="space-y-6">
              {/* Needs comparison */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Necesidades Básicas y Compromisos de Deuda</span>
                  <span className="text-slate-500">Real: {needsPct.toFixed(0)}% / Objetivo: {rule.targetNeeds}%</span>
                </div>
                <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 overflow-hidden">
                  <div 
                    className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ${
                      needsPct > rule.targetNeeds ? "bg-rose-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min(needsPct, 100)}%` }}
                  ></div>
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10" 
                    style={{ left: `${rule.targetNeeds}%` }}
                    title={`Límite del ${rule.targetNeeds}%`}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {needsPct > rule.targetNeeds 
                    ? `⚠️ Te excedes por ${Math.round(needsPct - rule.targetNeeds)}% del presupuesto recomendado. Reduce suscripciones o abona a deudas para bajar cuotas fijas.`
                    : "✅ Cumples holgadamente con esta porción."}
                </p>
              </div>

              {/* Wants comparison (only if rule separates it, otherwise 70/30 combined) */}
              {rule.targetWants > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Estilo de Vida y Deseos (Gastos Variables)</span>
                    <span className="text-slate-500">Real: {wantsPct.toFixed(0)}% / Objetivo: {rule.targetWants}%</span>
                  </div>
                  <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 overflow-hidden">
                    <div 
                      className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ${
                        wantsPct > rule.targetWants ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(wantsPct, 100)}%` }}
                    ></div>
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10" 
                      style={{ left: `${rule.targetWants}%` }}
                      title={`Límite del ${rule.targetWants}%`}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {wantsPct > rule.targetWants 
                      ? `⚠️ Gastas un ${Math.round(wantsPct - rule.targetWants)}% extra en variables. Modera salidas o compras para no restar capacidad de ahorro.`
                      : "✅ Tu estilo de vida es congruente con tu nivel de ingresos."}
                  </p>
                </div>
              )}

              {/* Savings comparison */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Inversión y Fondo de Ahorros</span>
                  <span className="text-slate-500">Real: {savingsPct.toFixed(0)}% / Objetivo: {rule.targetSavings}%</span>
                </div>
                <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 left-0 rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(savingsPct, 100)}%` }}
                  ></div>
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10" 
                    style={{ left: `${rule.targetSavings}%` }}
                    title={`Límite del ${rule.targetSavings}%`}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {savingsPct < rule.targetSavings 
                    ? `⚠️ Te falta un ${Math.round(rule.targetSavings - savingsPct)}% para cumplir con tu meta de libertad financiera futura.`
                    : "✅ ¡Excelente! Superas la tasa recomendada de ahorro."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Debt Acceleration Simulator */}
      {activeDebts.length > 0 ? (
        <section className={`p-6 border rounded-3xl shadow-xl space-y-6 ${
          theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/80"
        }`}>
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>Simulador Avanzado de Liquidación de Deudas</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Simula el impacto de un abono extraordinario mensual e identifica el método ideal de amortización acelerada.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Parameter */}
            <div className="space-y-5 lg:border-r border-slate-200 dark:border-slate-800/80 lg:pr-8">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">
                  Abono Extraordinario Mensual (Simulado)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={extraPaymentInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setExtraPaymentInput(e.target.value)}
                    placeholder="Monto adicional"
                    className={`w-full border rounded-xl py-3 px-4 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 text-sm font-bold transition ${
                      theme === "dark"
                        ? "bg-slate-950 border-slate-800 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    COP
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Monto mensual adicional que tienes disponible para pagar tus deudas (sobre los pagos mínimos).
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-400 block uppercase">Comparador de Métodos:</span>
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl border border-slate-250 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-1">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-500">
                      <Snowflake className="w-3.5 h-3.5" /> Bola de Nieve (Snowball)
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Se priorizan las deudas de menor saldo. Aumenta la motivación psicológica rápido al liquidar cuentas una a una.
                    </p>
                  </div>
                  
                  <div className="p-3.5 rounded-xl border border-slate-250 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-1">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-rose-500">
                      <Flame className="w-3.5 h-3.5" /> Cash Flow Index (CFI)
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Se priorizan las deudas más ineficientes (saldo bajo vs cuota alta). Libera flujo de caja mensual con el menor capital posible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulations Results */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Min only card */}
                <div className={`p-4 rounded-2xl border ${
                  theme === "dark" ? "bg-slate-950/50 border-slate-850" : "bg-slate-50/65 border-slate-200"
                }`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sin Abonos Extra</span>
                  <div className="text-xl font-black text-rose-500 mt-1">
                    {minOnlyTimeline.months >= 240 ? "Más de 20 años" : `${minOnlyTimeline.months} meses`}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Pagando únicamente el mínimo mensual.</span>
                </div>

                {/* Snowball card */}
                <div className={`p-4 rounded-2xl border ${
                  theme === "dark" ? "bg-slate-950/50 border-slate-850" : "bg-slate-50/65 border-slate-200"
                }`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Método Bola de Nieve</span>
                  <div className="text-xl font-black text-emerald-500 mt-1">
                    {snowballTimeline.months} meses
                  </div>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400/90 font-bold mt-1 block">
                    ¡Ahorras {Math.max(0, minOnlyTimeline.months - snowballTimeline.months)} meses!
                  </span>
                </div>

                {/* CFI card */}
                <div className={`p-4 rounded-2xl border ${
                  theme === "dark" ? "bg-slate-950/50 border-slate-850" : "bg-slate-50/65 border-slate-200"
                }`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Método Cash Flow Index</span>
                  <div className="text-xl font-black text-indigo-500 mt-1">
                    {cfiTimeline.months} meses
                  </div>
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 block">
                    ¡Ahorras {Math.max(0, minOnlyTimeline.months - cfiTimeline.months)} meses!
                  </span>
                </div>
              </div>

              {/* Debt payoff queues order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-250 dark:border-slate-850/60">
                {/* Snowball Order */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5" /> Orden Prioritario Bola de Nieve
                  </span>
                  <div className="space-y-2">
                    {snowballOrder.map((d, index) => (
                      <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                        theme === "dark" ? "bg-slate-950/20 border-slate-850" : "bg-slate-50/40 border-slate-150"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 font-black text-[10px] flex items-center justify-center border border-indigo-500/20">
                            {index + 1}
                          </span>
                          <span className="font-bold">{d.title}</span>
                        </div>
                        <span className="font-bold text-slate-500">{formatCurrency(d.remaining_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CFI Order */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase text-rose-500 tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Orden Prioritario Cash Flow Index
                  </span>
                  <div className="space-y-2">
                    {cfiOrder.map((d, index) => {
                      const cfiVal = d.minimum_payment > 0 ? d.remaining_amount / d.minimum_payment : 999;
                      return (
                        <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                          theme === "dark" ? "bg-slate-950/20 border-slate-850" : "bg-slate-50/40 border-slate-150"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-500 font-black text-[10px] flex items-center justify-center border border-rose-500/20">
                              {index + 1}
                            </span>
                            <span className="font-bold">{d.title}</span>
                          </div>
                          <div className="text-right">
                            <span className="block font-bold text-slate-500">{formatCurrency(d.remaining_amount)}</span>
                            <span className="block text-[9px] text-slate-400 font-bold">CFI: {cfiVal.toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className={`p-8 border rounded-3xl text-center space-y-2 ${
          theme === "dark" ? "bg-slate-900/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">¡Libertad Financiera Conseguida!</p>
          <p className="text-xs">No posees deudas activas registradas en tu balance. ¡Usa el simulador de ahorro para expandir tu patrimonio!</p>
        </div>
      )}
    </div>
  );
}
