"use client";

import React from "react";
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyFinanceSummary } from "@/lib/finance-calculations";
import { getDtiLevel } from "@/lib/finance-calculations";

interface ImprovementTipsProps {
  summary: MonthlyFinanceSummary;
}

interface Tip {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "info" | "warning" | "success";
}

function buildTips(summary: MonthlyFinanceSummary): Tip[] {
  const tips: Tip[] = [];
  const dtiLevel = getDtiLevel(summary.dtiRatio);

  if (summary.realAvailableCash < 0) {
    tips.push({
      id: "deficit",
      title: "Cierra el déficit del mes",
      body: `Te faltan ${formatCurrency(Math.abs(summary.realAvailableCash))} para cuadrar ingresos, gastos y ahorro. Revisa gastos variables o registra un ingreso extra en el cronograma.`,
      href: "/schedule",
      cta: "Planificar mes",
      tone: "warning",
    });
  }

  if (dtiLevel === "critical") {
    tips.push({
      id: "dti",
      title: "DTI elevado: prioriza deudas",
      body: `Destinas ${summary.dtiRatio.toFixed(0)}% de tus ingresos a cuotas mínimas. Usa el asesor para simular abonos extra y reducir meses de deuda.`,
      href: "/advisor",
      cta: "Abrir asesor",
      tone: "warning",
    });
  }

  if (summary.pendingObligationsCount > 0) {
    tips.push({
      id: "pending",
      title: `${summary.pendingObligationsCount} obligación(es) pendiente(s)`,
      body: "Marca gastos fijos y cuotas de deuda en el cronograma para mantener trazabilidad del mes.",
      href: "/schedule",
      cta: "Ir al cronograma",
      tone: "info",
    });
  }

  if (summary.realAvailableCash > 0 && summary.totalOutstandingDebt > 0) {
    tips.push({
      id: "extra-pay",
      title: "Tienes margen para abonar deuda",
      body: `Podrías destinar hasta ${formatCurrency(Math.max(0, summary.realAvailableCash))} a un abono extraordinario y acortar tu plan de libertad financiera.`,
      href: "/debts",
      cta: "Registrar abono",
      tone: "success",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "ok",
      title: "Buen ritmo este mes",
      body: "Mantén el registro de cada gasto y revisa la proyección a futuro para ajustar tu meta de ahorro.",
      href: "/simulator",
      cta: "Ver simulador",
      tone: "success",
    });
  }

  return tips.slice(0, 3);
}

export function ImprovementTips({ summary }: ImprovementTipsProps) {
  const { theme } = useTheme();
  const tips = buildTips(summary);

  const toneClasses = {
    info: "border-indigo-500/20 bg-indigo-500/5",
    warning: "border-amber-500/25 bg-amber-500/5",
    success: "border-emerald-500/20 bg-emerald-500/5",
  };

  return (
    <section
      className={`border rounded-3xl p-6 space-y-4 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200/80"
      }`}
    >
      <h3 className="text-base font-black flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <span>Cómo mejorar este mes</span>
      </h3>

      <ul className="space-y-3">
        {tips.map((tip) => (
          <li
            key={tip.id}
            className={`p-4 rounded-2xl border ${toneClasses[tip.tone]}`}
          >
            <p className="text-xs font-black text-slate-800 dark:text-slate-100">
              {tip.title}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-relaxed">
              {tip.body}
            </p>
            <Link
              href={tip.href}
              className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {tip.cta}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
