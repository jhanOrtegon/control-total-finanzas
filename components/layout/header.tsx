"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { ArrowLeft, LogOut } from "lucide-react";
import { SyncStatus } from "@/components/layout/sync-status";
import { AlertBadge } from "@/components/layout/alert-badge";
import { PeriodSelector } from "@/components/shared/period-selector";
import { MobileNav } from "@/components/layout/mobile-nav";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { signOut } = useAuth();

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
    <header className={`backdrop-blur-md border-b sticky top-0 z-20 pt-[env(safe-area-inset-top)] ${
      theme === "dark" ? "bg-slate-950/80 border-slate-900/60" : "bg-white/90 border-slate-200/80 shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <MobileNav />
          {pathname !== "/" && (
            <button
              onClick={() => router.back()}
              className={`p-2 rounded-xl transition-colors shrink-0 hidden md:flex ${
                theme === "dark" 
                  ? "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
              }`}
              title="Retroceder"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className={`text-base md:text-xl font-bold tracking-tight truncate max-w-[130px] sm:max-w-full ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}>
              {title}
            </h1>
            <p className="hidden md:block text-xs text-slate-500 font-medium truncate">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="block">
            <PeriodSelector compact />
          </div>
          <div className="hidden sm:block">
            <SyncStatus />
          </div>
          <AlertBadge />
          
          {/* Logout button visible on mobile directly in the header */}
          <button
            onClick={signOut}
            className={`px-3 py-2 rounded-xl transition-colors shrink-0 md:hidden flex items-center gap-1.5 ${
              theme === "dark" 
                ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" 
                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
            }`}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
