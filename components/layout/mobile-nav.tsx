"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  BarChart3,
  Layers,
  ShieldAlert,
  Calendar,
  TrendingUp,
  LineChart,
  History,
  FileBarChart,
  Sparkles,
  Bell,
  Settings,
  Wallet,
  Activity,
  PiggyBank,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";

const navGroups = [
  {
    title: "General",
    items: [{ href: "/", label: "Dashboard", icon: BarChart3 }],
  },
  {
    title: "Finanzas",
    items: [
      { href: "/expenses", label: "Gastos", icon: Layers },
      { href: "/debts", label: "Deudas", icon: ShieldAlert },
      { href: "/budgets", label: "Sobres", icon: Wallet },
      { href: "/savings", label: "Ahorros", icon: PiggyBank },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/schedule", label: "Cronograma", icon: Calendar },
      { href: "/simulator", label: "Simulador", icon: TrendingUp },
      { href: "/trends", label: "Cierre", icon: LineChart },
    ],
  },
  {
    title: "Reportes",
    items: [
      { href: "/history", label: "Historial", icon: History },
      { href: "/reports", label: "Informes", icon: FileBarChart },
      { href: "/logs", label: "Logs", icon: Activity },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { href: "/advisor", label: "Asesor", icon: Sparkles },
      { href: "/alerts", label: "Alertas", icon: Bell },
      { href: "/settings", label: "Ajustes", icon: Settings },
    ],
  },
];

// The 5 most important tabs for the bottom bar
const BOTTOM_TABS = [
  { href: "/", label: "Inicio", icon: BarChart3 },
  { href: "/expenses", label: "Gastos", icon: Layers },
  { href: "/debts", label: "Deudas", icon: ShieldAlert },
  { href: "/schedule", label: "Pagos", icon: Calendar },
  { href: "/alerts", label: "Alertas", icon: Bell },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <>
      {/* ── Bottom Tab Bar (always visible on mobile) ───────────────── */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t flex items-center justify-around h-16 safe-area-bottom ${
          theme === "dark"
            ? "bg-slate-950/95 border-slate-800 backdrop-blur-xl"
            : "bg-white/95 border-slate-200 backdrop-blur-xl shadow-2xl shadow-slate-900/10"
        }`}
        aria-label="Navegación principal"
      >
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? theme === "dark"
                    ? "text-indigo-400"
                    : "text-indigo-600"
                  : theme === "dark"
                  ? "text-slate-500 hover:text-slate-300"
                  : "text-slate-400 hover:text-slate-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />
              )}
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wide ${isActive ? "opacity-100" : "opacity-70"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Full-screen drawer for all sections ─────────────────────── */}
      {/* Hamburger button (only shown in the header, triggers the full drawer) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          aria-label="Abrir menú completo"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex flex-col md:hidden ${
            theme === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-900"
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="font-black text-sm">Libertad <span className="text-indigo-500">Financiera</span></p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Todos los módulos</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* All nav links */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-28">
            {navGroups.map((g) => (
              <div key={g.title}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                  {g.title}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition border ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                            : theme === "dark"
                            ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
