"use client";

import React, { useState, useEffect } from "react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import {
  Sparkles,
  PiggyBank,
  TrendingDown,
  TrendingUp as NetWorthIcon,
  AlertCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BriefcaseBusiness,
  ShieldCheck,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useAuth } from "@/providers/auth-provider";

export default function SimulatorPage() {
  const { theme } = useTheme();
  const { budget, debts, expenses, getMonthlySummary } = useFinance();
  const { user } = useAuth();

  // Simulator state variables
  const [initialCapital, setInitialCapital] = useState<number | "">(1000000); // 1M COP default
  const [monthlySavings, setMonthlySavings] = useState<number | "">("");
  const [annualRate, setAnnualRate] = useState<string>("12"); // 12% CDT/Investment return
  const [estimatedInflation, setEstimatedInflation] = useState<string>("5"); // 5% default inflation
  const [extraDebtPay, setExtraDebtPay] = useState<number | "">(200000); // 200k COP extra default
  const [horizonMonths, setHorizonMonths] = useState<number>(120); // 10 years default to show FIRE more often
  const [fireExpenses, setFireExpenses] = useState<number | "">(3000000); // Monthly expenses needed for FIRE

  // Pre-populate savings contribution from user's budget settings once loaded
  useEffect(() => {
    if (budget?.monthly_savings_goal) {
      setMonthlySavings(budget.monthly_savings_goal);
    } else {
      setMonthlySavings(300000); // fallback
    }
  }, [budget]);

  const activeDebts = debts.filter((d) => d.remaining_amount > 0);

  // Parse numeric values
  const initCap = (initialCapital as number) || 0;
  const monthlySave = (monthlySavings as number) || 0;
  const rate = parseFloat(annualRate) || 0;
  const infRate = parseFloat(estimatedInflation) || 0;
  const extraDebt = (extraDebtPay as number) || 0;
  const targetFireMonthly = (fireExpenses as number) || 0;
  
  // FIRE Target (4% rule: Annual expenses / 0.04)
  const fireTarget = targetFireMonthly > 0 ? (targetFireMonthly * 12) / 0.04 : 0;

  // Run month-by-month projection simulation
  const monthsTotal = horizonMonths;
  const projectionData: {
    month: number;
    year: number;
    monthInYear: number;
    savings: number;
    debt: number;
    netWorth: number;
    interestEarned: number;
  }[] = [];

  // Initialize simulation states
  let currentSavings = initCap;
  let accumulatedInterest = 0;

  // Clone active debts for step-by-step reduction
  let simulatedDebts = activeDebts.map((d) => ({
    id: d.id,
    title: d.title,
    balance: d.remaining_amount,
    minPay: d.minimum_payment,
  }));

  let debtFreeMonth: number | null = null;
  let crossingMonth: number | null = null;
  let fireMonth: number | null = null;

  for (let m = 1; m <= monthsTotal; m++) {
    // 1. Savings Compound Interest step
    const monthlyRate = rate / 12 / 100;
    const interest = currentSavings * monthlyRate;
    accumulatedInterest += interest;
    currentSavings = currentSavings + monthlySave + interest;

    // 2. Debt paydown step (Snowball order: smallest balance first)
    // Sort debts by active balance (smallest first)
    simulatedDebts.sort((a, b) => a.balance - b.balance);

    let totalRemainingDebt = 0;
    let extraPool = extraDebt;

    // Pay minimums on all active debts
    for (const d of simulatedDebts) {
      if (d.balance > 0) {
        const minToPay = Math.min(d.minPay, d.balance);
        d.balance -= minToPay;
        if (d.balance === 0) {
          // Add freed-up minimum payment to this month's extra pool
          extraPool += d.minPay;
        }
      }
    }

    // Apply extra payments to first active debt
    for (const d of simulatedDebts) {
      if (d.balance > 0 && extraPool > 0) {
        const extraToPay = Math.min(extraPool, d.balance);
        d.balance -= extraToPay;
        extraPool -= extraToPay;
        if (d.balance === 0) {
          extraPool += d.minPay;
        }
      }
      totalRemainingDebt += d.balance;
    }

    // Record debt free milestone
    if (totalRemainingDebt === 0 && debtFreeMonth === null && activeDebts.length > 0) {
      debtFreeMonth = m;
    }

    // Record net worth crossover milestone (savings > remaining debt)
    if (currentSavings > totalRemainingDebt && crossingMonth === null && totalRemainingDebt > 0) {
      crossingMonth = m;
    }

    const netWorth = currentSavings - totalRemainingDebt;

    // Record FIRE milestone
    if (netWorth >= fireTarget && fireMonth === null && fireTarget > 0) {
      fireMonth = m;
    }

    projectionData.push({
      month: m,
      year: Math.ceil(m / 12),
      monthInYear: m % 12 === 0 ? 12 : m % 12,
      savings: Math.round(currentSavings),
      debt: Math.round(totalRemainingDebt),
      netWorth: Math.round(netWorth),
      interestEarned: Math.round(accumulatedInterest),
    });
  }

  // Get final figures
  const finalData = projectionData[projectionData.length - 1];
  const finalSavings = finalData?.savings || 0;
  const finalDebt = finalData?.debt || 0;
  const finalNetWorth = finalData?.netWorth || 0;
  const finalInterest = finalData?.interestEarned || 0;

  // Real Purchasing Power (adjusted for inflation)
  const finalRealNetWorth = finalNetWorth / Math.pow(1 + infRate / 100, horizonMonths / 12);

  const horizonLabel =
    horizonMonths === 6
      ? "6 meses"
      : horizonMonths % 12 === 0
      ? `${horizonMonths / 12} ${horizonMonths / 12 === 1 ? "año" : "años"}`
      : `${horizonMonths} meses`;

  // Filter yearly milestones for compact rendering
  const yearlyMilestones = projectionData.filter((d) => d.monthInYear === 12);
  const projectionMilestones = horizonMonths <= 12 ? projectionData : yearlyMilestones;
  const projectionGranularityLabel = horizonMonths <= 12 ? "mensual" : "anual";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Introduction Card */}
      <section className={`p-6 border rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden ${
        theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <div className="space-y-2 z-10 max-w-2xl">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-500 bg-indigo-500/5 px-3 py-1 rounded-xl border border-indigo-500/10">
            Predicción Económica Inteligente
          </span>
          <h2 className="text-xl font-black">Planificador del Futuro Económico</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Visualiza cómo se transformará tu patrimonio neto con el paso del tiempo. Este simulador integra el crecimiento compuesto de tu ahorro y la amortización acelerada de tus deudas bajo un plan constante.
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
          <Sparkles className="w-12 h-12" />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 border rounded-2xl ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Horizonte actual</span>
          <p className="text-lg font-black text-indigo-500 mt-1">{horizonLabel}</p>
        </div>
        <div className={`p-4 border rounded-2xl ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Deuda activa inicial</span>
          <p className="text-lg font-black text-rose-500 mt-1">{formatCurrency(activeDebts.reduce((acc, d) => acc + d.remaining_amount, 0))}</p>
        </div>
        <div className={`p-4 border rounded-2xl ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Perfil del plan</span>
          <p className="text-lg font-black text-emerald-500 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Proyección Conservadora
          </p>
        </div>
      </section>

      {/* Inputs and Output Summary Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Side: Parameters Slider/Form */}
        <div className={`p-6 border rounded-3xl shadow-xl space-y-6 ${
          theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div>
            <h3 className="text-sm font-black flex items-center gap-1.5 mb-1">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Parámetros del Plan</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              Ajusta tus variables económicas para proyectar el resultado final.
            </p>
          </div>

          <div className="space-y-4">
            {/* Initial Capital */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Capital Inicial de Ahorro</label>
              <div className="relative">
                <CurrencyInput
                  value={initialCapital === "" ? undefined : initialCapital}
                  onChange={(val) => setInitialCapital(val)}
                  title="Capital inicial de ahorro"
                  className={`w-full border rounded-xl py-2 focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 text-xs font-bold transition ${
                    theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">COP</span>
              </div>
            </div>

            {/* Monthly Savings Goal */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ahorro Mensual Nuevo</label>
              <div className="relative">
                <CurrencyInput
                  value={monthlySavings === "" ? undefined : monthlySavings}
                  onChange={(val) => setMonthlySavings(val)}
                  title="Ahorro mensual nuevo"
                  className={`w-full border rounded-xl py-2 focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 text-xs font-bold transition ${
                    theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">COP/mes</span>
              </div>
            </div>

            {/* Annual CDT/Investment Return Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Rendimiento Anual Estimado</label>
                <span className="text-[10px] font-black text-indigo-500">{rate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                title="Rendimiento anual estimado"
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                Tasa de interés compuesto anual para tu capital (ej. CDTs, fondos de inversión).
              </p>
            </div>

            {/* Estimated Annual Inflation */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Inflación Anual Esperada</label>
                <span className="text-[10px] font-black text-rose-500">{infRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={estimatedInflation}
                onChange={(e) => setEstimatedInflation(e.target.value)}
                title="Inflación anual estimada"
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                Pérdida de poder adquisitivo por devaluación. Se usa para calcular el valor *real* de tu dinero.
              </p>
            </div>

            {/* FIRE Monthly Expenses Target */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gastos Mensuales de Jubilación (FIRE)</label>
              <div className="relative">
                <CurrencyInput
                  value={fireExpenses === "" ? undefined : fireExpenses}
                  onChange={(val) => setFireExpenses(val)}
                  title="Gastos mensuales para tu jubilación temprana"
                  className={`w-full border rounded-xl py-2 focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 text-xs font-bold transition ${
                    theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">COP/mes</span>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold">
                Cuánto dinero mensual necesitas para vivir sin trabajar. Meta FIRE requerida: {formatCurrency(fireTarget)}.
              </p>
            </div>

            {/* Extra Debt Payment */}
            {activeDebts.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Abono Extraordinario Mensual</label>
                <div className="relative">
                  <CurrencyInput
                    value={extraDebtPay === "" ? undefined : extraDebtPay}
                    onChange={(val) => setExtraDebtPay(val)}
                    title="Abono extraordinario mensual"
                    className={`w-full border rounded-xl py-2 focus:outline-none focus:ring-1 focus:ring-slate-400/20 focus:border-slate-400 text-xs font-bold transition ${
                      theme === "dark" ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">COP/mes</span>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold">
                  Monto adicional al pago mínimo mensual asignado exclusivamente a liquidar deudas.
                </p>
              </div>
            )}

            {/* Horizon Years */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Plazo de Proyección</label>
              <div className="grid grid-cols-5 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
                {[6, 12, 36, 60, 120].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setHorizonMonths(m)}
                    className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      horizonMonths === m
                        ? theme === "dark"
                          ? "bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 ring-1 ring-indigo-400/30"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200 ring-1 ring-indigo-200"
                        : "text-slate-500 border border-transparent hover:border-slate-300 hover:text-slate-800 dark:hover:text-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    {m === 6 ? "6 Meses" : `${m / 12} ${m === 12 ? "Año" : "Años"}`}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 font-semibold">Elige entre proyección táctica (6 meses) o estratégica (1-10 años).</p>
            </div>
          </div>
        </div>

        {/* Right Side: Projections Cards & Milestones (occupies 2 columns) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Net Worth Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Card Net Worth */}
            <div className={`p-5 border rounded-3xl shadow-md ${
              theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <NetWorthIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Patrimonio Neto a {horizonLabel}</span>
              </div>
              <div className={`text-xl font-black ${finalNetWorth >= 0 ? "text-indigo-500" : "text-rose-500"}`}>
                {formatCurrency(finalNetWorth)}
              </div>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                Valor Nominal Acumulado.
              </span>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-500 block uppercase">Poder Adquisitivo Real:</span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {formatCurrency(finalRealNetWorth)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Descontando {infRate}% anual.</span>
              </div>
            </div>

            {/* Card Savings */}
            <div className={`p-5 border rounded-3xl shadow-md ${
              theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ahorros + Intereses</span>
              </div>
              <div className="text-xl font-black text-emerald-500">
                {formatCurrency(finalSavings)}
              </div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                Incluye {formatCurrency(finalInterest)} de rendimiento.
              </span>
            </div>

            {/* Card Debt */}
            <div className={`p-5 border rounded-3xl shadow-md ${
              theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                <span>Deuda Restante</span>
              </div>
              <div className={`text-xl font-black ${finalDebt === 0 ? "text-slate-400" : "text-rose-500"}`}>
                {formatCurrency(finalDebt)}
              </div>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                {finalDebt === 0 ? "🎉 ¡Totalmente libre de deudas!" : "Deuda pendiente de amortización."}
              </span>
            </div>
          </div>

          <div className={`p-5 border rounded-3xl shadow-md ${
            theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
              <BriefcaseBusiness className="w-3.5 h-3.5 text-indigo-500" />
              <span>Recomendación Ejecutiva</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              {finalNetWorth > 0
                ? `Tu plan proyecta patrimonio positivo en ${horizonLabel}. Mantén constancia y considera aumentar el ahorro mensual en un 10% para acelerar resultados.`
                : `Tu plan aún no cruza a patrimonio positivo en ${horizonLabel}. Prioriza incrementar ahorro mensual y abono extraordinario para cerrar brecha.`}
            </p>
          </div>

          {/* Milestones Panel */}
          <div className={`p-5 border rounded-3xl shadow-xl ${
            theme === "dark" ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <h4 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider">Hitos Clave del Plan</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Debt Free Milestone */}
              <div className={`p-3 rounded-2xl border text-xs flex items-start gap-3 ${
                theme === "dark" ? "bg-slate-950/45 border-slate-850" : "bg-slate-50 border-slate-150"
              }`}>
                {activeDebts.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">Libre de Deudas</span>
                      <p className="text-[10px] text-slate-400 font-semibold">No posees pasivos activos actualmente. ¡Todo tu ahorro va directo a crecer!</p>
                    </div>
                  </>
                ) : debtFreeMonth ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">
                        Libertad de Deuda en Mes {debtFreeMonth}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Aproximadamente en {Math.ceil(debtFreeMonth / 12)} {Math.ceil(debtFreeMonth / 12) === 1 ? "año" : "años"} y {debtFreeMonth % 12} meses liquidas todas tus cuotas.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">Deuda Excede el Horizonte</span>
                      <p className="text-[10px] text-slate-400 font-semibold">Tu plan no es suficiente para saldar la deuda en {horizonLabel}. Aumenta el abono extra.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Net Worth Crossover Milestone */}
              <div className={`p-3 rounded-2xl border text-xs flex items-start gap-3 ${
                theme === "dark" ? "bg-slate-950/45 border-slate-850" : "bg-slate-50 border-slate-150"
              }`}>
                {activeDebts.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">Patrimonio Neto Positivo</span>
                      <p className="text-[10px] text-slate-400 font-semibold">Tus ahorros superan tu pasivo desde el día uno. Estabilidad económica sólida.</p>
                    </div>
                  </>
                ) : crossingMonth ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">
                        Cruce Patrimonial en Mes {crossingMonth}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        En el mes {crossingMonth}, tus ahorros líquidos superan tu balance total de deudas, cruzando a patrimonio positivo.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">Sin Cruce Patrimonial</span>
                      <p className="text-[10px] text-slate-400 font-semibold">Tus deudas siguen superando tus ahorros líquidos durante todo el plazo de {horizonLabel}.</p>
                    </div>
                  </>
                )}
              </div>

              {/* FIRE Milestone */}
              <div className={`p-3 rounded-2xl border text-xs flex items-start gap-3 md:col-span-2 ${
                theme === "dark" ? "bg-slate-950/45 border-slate-850" : "bg-slate-50 border-slate-150"
              }`}>
                {fireMonth ? (
                  <>
                    <PiggyBank className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">
                        🔥 Jubilación Temprana (FIRE) Alcanzada en Mes {fireMonth}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        ¡Felicidades! En aproximadamente {Math.ceil(fireMonth / 12)} {Math.ceil(fireMonth / 12) === 1 ? "año" : "años"} y {fireMonth % 12} meses, tus ahorros acumulados llegarán a {formatCurrency(fireTarget)}, lo que te permitiría retirar {formatCurrency(targetFireMonthly)} mensuales de por vida asumiendo un retiro seguro del 4%.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <PiggyBank className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-slate-800 dark:text-slate-200 mb-0.5">Progreso hacia Independencia Financiera (FIRE)</span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Aún no alcanzas el monto objetivo de {formatCurrency(fireTarget)} en el plazo de {horizonLabel}. Estás al {Math.min(100, (finalNetWorth / fireTarget) * 100).toFixed(1)}% de lograrlo.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trajectory Visual Bar Chart */}
      <section className={`p-6 border rounded-3xl shadow-xl ${
        theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <div>
          <h3 className="text-sm font-black mb-1">Trayectoria de Planificación Financiera</h3>
          <p className="text-[10px] text-slate-400 font-semibold">
            Visualización {projectionGranularityLabel} comparativa de tus ahorros acumulados vs saldo de deudas en el transcurso del plazo.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {projectionMilestones.map((milestone) => {
            const totalMax = Math.max(milestone.savings, milestone.debt, 1);
            const savingsWidth = (milestone.savings / totalMax) * 100;
            const debtWidth = (milestone.debt / totalMax) * 100;

            return (
              <div key={`${milestone.year}-${milestone.month}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border-b border-slate-100 dark:border-slate-850/80 pb-4">
                <span className="md:col-span-2 text-xs font-black text-slate-500">
                  {horizonMonths <= 12 ? `Mes ${milestone.month}` : `Año ${milestone.year} (Mes ${milestone.month})`}
                </span>

                <div className="md:col-span-7 space-y-2">
                  {/* Savings Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-emerald-500 w-12 text-right shrink-0">Ahorro</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-900">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${savingsWidth}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Debt Bar */}
                  {milestone.debt > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-rose-500 w-12 text-right shrink-0">Deuda</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-900">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${debtWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-3 text-right text-xs">
                  <div className="font-extrabold text-slate-700 dark:text-slate-350">
                    Neto: <span className={milestone.netWorth >= 0 ? "text-indigo-500" : "text-rose-500"}>
                      {formatCurrency(milestone.netWorth)}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Ahorrado: {formatCurrency(milestone.savings)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Projection Details Grid */}
      <section className={`p-6 border rounded-3xl shadow-xl overflow-x-auto ${
        theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <h3 className="text-sm font-black mb-4">Tabla {horizonMonths <= 12 ? "Mensual" : "General"} de Crecimiento del Plan</h3>

        <table className="w-full text-left border-collapse min-w-150">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <th className="py-2.5">Año</th>
              <th className="py-2.5">Mes</th>
              <th className="py-2.5">Ahorro Acumulado</th>
              <th className="py-2.5">Interés Compuesto</th>
              <th className="py-2.5">Deuda Pendiente</th>
              <th className="py-2.5 text-right">Patrimonio Neto</th>
            </tr>
          </thead>
          <tbody className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {projectionMilestones.map((milestone) => (
              <tr key={`table-${milestone.year}-${milestone.month}`} className="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition">
                <td className="py-3 font-black text-slate-900 dark:text-white">Año {milestone.year}</td>
                <td className="py-3 text-slate-400 font-bold">Mes {milestone.month}</td>
                <td className="py-3 text-emerald-500">{formatCurrency(milestone.savings)}</td>
                <td className="py-3 text-slate-400">{formatCurrency(milestone.interestEarned)}</td>
                <td className="py-3 text-rose-500">{formatCurrency(milestone.debt)}</td>
                <td className={`py-3 text-right font-black ${milestone.netWorth >= 0 ? "text-indigo-500" : "text-rose-500"}`}>
                  {formatCurrency(milestone.netWorth)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
