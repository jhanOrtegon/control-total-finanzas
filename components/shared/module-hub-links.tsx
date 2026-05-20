"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  Calendar,
  ShieldAlert,
  Wallet,
  History,
  LineChart,
  Bell,
  FileBarChart,
  Settings,
} from "lucide-react";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";

const MODULES = [
  { href: "/expenses", label: "Gastos", icon: Layers, desc: "Registrar y revisar" },
  { href: "/schedule", label: "Cronograma", icon: Calendar, desc: "Obligaciones del mes" },
  { href: "/debts", label: "Deudas", icon: ShieldAlert, desc: "Abonos y saldos" },
  { href: "/budgets", label: "Sobres", icon: Wallet, desc: "Topes por categoría" },
  { href: "/history", label: "Historial", icon: History, desc: "Libro de movimientos" },
  { href: "/trends", label: "Evolución", icon: LineChart, desc: "Cierre y tendencias" },
  { href: "/alerts", label: "Alertas", icon: Bell, desc: "Vencimientos y avisos" },
  { href: "/reports", label: "Informes", icon: FileBarChart, desc: "Reporte detallado" },
  { href: "/settings", label: "Ajustes", icon: Settings, desc: "Ingreso y presupuesto" },
] as const;

export function ModuleHubLinks() {
  const { theme } = useTheme();
  const { linkWithPeriod, periodLabel } = useFinancePeriod();

  return (
    <section
      className={`border rounded-3xl p-5 space-y-3 ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div>
        <h3 className="text-sm font-black">Ir al módulo relacionado</h3>
        <p className="text-[10px] text-slate-500 font-semibold">
          Enlaces con el periodo activo: {periodLabel}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const href = m.href === "/settings" ? m.href : linkWithPeriod(m.href);
          return (
            <Link
              key={m.href}
              href={href}
              className={`flex items-start gap-2 p-3 rounded-xl border transition hover:border-indigo-400/50 ${
                theme === "dark"
                  ? "bg-slate-950/50 border-slate-800 hover:bg-slate-900"
                  : "bg-slate-50 border-slate-200 hover:bg-indigo-50/50"
              }`}
            >
              <Icon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <span className="block text-[11px] font-black">{m.label}</span>
                <span className="block text-[9px] text-slate-500 font-semibold">
                  {m.desc}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
