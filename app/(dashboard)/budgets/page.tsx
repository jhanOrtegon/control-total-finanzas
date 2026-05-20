"use client";

import React from "react";
import Link from "next/link";
import { CategoryEnvelopes } from "@/components/budgets/category-envelopes";
import { Settings } from "lucide-react";

export default function BudgetsPage() {
  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">
          Presupuesto por categoría
        </h1>
        <p className="text-xs text-slate-500 font-semibold max-w-lg">
          Asigna un tope mensual a cada categoría (método de sobres) y controla
          el gasto en tiempo real. El pool se toma de tu presupuesto en{" "}
          <Link
            href="/settings"
            className="text-indigo-600 font-bold inline-flex items-center gap-0.5 hover:underline"
          >
            Ajustes <Settings className="w-3 h-3" />
          </Link>
          .
        </p>
      </header>
      <CategoryEnvelopes />
    </div>
  );
}
