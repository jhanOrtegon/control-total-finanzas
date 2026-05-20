"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/providers/theme-provider";
import { SyncStatus } from "@/components/layout/sync-status";
import { AlertBadge } from "@/components/layout/alert-badge";
import { PeriodSelector } from "@/components/shared/period-selector";

export function Header() {
  const pathname = usePathname();
  const { theme } = useTheme();

  const getRouteDetails = () => {
    switch (pathname) {
      case "/":
        return {
          title: "Mi Salud Financiera",
          subtitle: "Monitoreo de flujo de caja y amortización de deudas",
        };
      case "/expenses":
        return {
          title: "Bitácora de Gastos y Facturas",
          subtitle: "Lleva al día tus facturas recurrentes y consumos del día",
        };
      case "/debts":
        return {
          title: "Plan de Reducción de Deudas",
          subtitle: "Registra tus préstamos, tarjetas y abona para saldarlos",
        };
      case "/schedule":
        return {
          title: "Cronograma de Pagos Anual",
          subtitle: "Planifica tus facturas y abonos a deudas mes a mes",
        };
      case "/settings":
        return {
          title: "Ajustes Generales del Plan",
          subtitle: "Edita tus ingresos reales, metas de ahorro y presupuestos",
        };
      case "/advisor":
        return {
          title: "Asesor Economista Pro",
          subtitle: "Simulador de reglas de presupuesto y aceleración de amortización de pasivos",
        };
      case "/simulator":
        return {
          title: "Proyección y Planificación Patrimonial",
          subtitle: "Calculadora de interés compuesto y liquidación progresiva de deudas",
        };
      case "/alerts":
        return {
          title: "Alertas y Vencimientos",
          subtitle:
            "Vencidos, próximos pagos, presupuesto, DTI y ritmo de gasto",
        };
      case "/history":
        return {
          title: "Libro de Movimientos",
          subtitle: "Trazabilidad de gastos, ingresos y abonos a deuda",
        };
      case "/trends":
        return {
          title: "Evolución y Cierre de Mes",
          subtitle:
            "Cierre guiado, comparación mes a mes e historial de snapshots",
        };
      case "/budgets":
        return {
          title: "Presupuesto por Categoría",
          subtitle: "Sobres mensuales y control por tipo de gasto",
        };
      case "/reports":
        return {
          title: "Informes y Reportes",
          subtitle:
            "Vista integrada del mes: flujo, categorías, deudas y recomendaciones",
        };
      default:
        return {
          title: "Libertad Financiera",
          subtitle: "Control de deudas y presupuestos",
        };
    }
  };

  const { title, subtitle } = getRouteDetails();

  return (
    <header className={`backdrop-blur-md border-b sticky top-0 z-20 ${
      theme === "dark" ? "bg-slate-950/40 border-slate-900/60" : "bg-white/70 border-slate-200/80 shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}>
            {title}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PeriodSelector compact />
          <AlertBadge />
          <SyncStatus />
        </div>
      </div>
    </header>
  );
}
