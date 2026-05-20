"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import {
  Sparkles,
  BarChart3,
  Layers,
  ShieldAlert,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Calendar,
  TrendingUp,
  History,
  LineChart,
  Wallet,
  Bell,
  FileBarChart,
} from "lucide-react";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);

  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const navGroups = [
    {
      title: "General",
      items: [{ href: "/", label: "Dashboard Deudas", icon: BarChart3 }],
    },
    {
      title: "Finanzas y Control",
      items: [
        { href: "/expenses", label: "Control de Gastos", icon: Layers },
        { href: "/debts", label: "Mis Deudas Activas", icon: ShieldAlert },
        { href: "/budgets", label: "Sobres por Categoría", icon: Wallet },
      ],
    },
    {
      title: "Planificación y Análisis",
      items: [
        { href: "/schedule", label: "Cronograma de Pagos", icon: Calendar },
        { href: "/simulator", label: "Simulador de Futuro", icon: TrendingUp },
        { href: "/trends", label: "Evolución y Cierre", icon: LineChart },
      ],
    },
    {
      title: "Reportes y Registros",
      items: [
        { href: "/history", label: "Historial / Trazabilidad", icon: History },
        { href: "/reports", label: "Informes Detallados", icon: FileBarChart },
      ],
    },
    {
      title: "Herramientas",
      items: [
        { href: "/advisor", label: "Asesor Economista Pro", icon: Sparkles },
        { href: "/alerts", label: "Alertas y Vencimientos", icon: Bell },
      ],
    },
    {
      title: "Sistema",
      items: [{ href: "/settings", label: "Ajustes Generales", icon: Settings }],
    },
  ];

  return (
    <aside
      className={`backdrop-blur-md border-r transition-all duration-300 sticky top-0 h-screen z-25 shrink-0 overflow-hidden hidden md:flex flex-col ${
        isExpanded ? "w-64" : "w-20"
      } ${
        theme === "dark"
          ? "bg-slate-900/60 border-slate-900 text-slate-100"
          : "bg-white border-slate-200 shadow-sm text-slate-900"
      }`}
    >
      {/* Sidebar Header */}
      <div
        className={`p-5 flex items-center justify-between border-b shrink-0 ${
          theme === "dark" ? "border-slate-950/60" : "border-slate-100"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-xl bg-slate-500/5 border border-slate-500/10 text-slate-500 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          {isExpanded && (
            <div className="transition-opacity duration-300">
              <h2 className="text-sm font-bold tracking-tight">
                Libertad <span className="text-indigo-600 dark:text-indigo-400">Financiera</span>
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plan Anti-Deuda</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation links (scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <nav className="space-y-6 pr-1">
          {navGroups.map((group, groupIdx) => (
            <div key={group.title} className="space-y-2">
              {/* Group Header */}
              {isExpanded && (
                <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {group.title}
                </div>
              )}
              {(!isExpanded && groupIdx > 0) && (
                <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-4 mx-auto" />
              )}

              {/* Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`w-full flex items-center rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                        isExpanded ? "gap-3.5 px-3 py-2.5 justify-start" : "justify-center p-3"
                      } ${
                        isActive
                          ? theme === "dark"
                            ? "bg-indigo-500/20 text-indigo-300 shadow-sm ring-1 ring-indigo-400/20"
                            : "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                          : theme === "dark"
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                      title={!isExpanded ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {isExpanded && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer (fixed at bottom) */}
      <div
        className={`p-4 border-t space-y-3 shrink-0 ${
          theme === "dark" ? "border-slate-950/60" : "border-slate-100"
        }`}
      >
        {/* Light/Dark mode switcher */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
            theme === "dark"
              ? "bg-slate-950 border-slate-900 text-yellow-400 hover:text-yellow-300"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isExpanded && (
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
            </span>
          )}
        </button>

        {/* Sidebar collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
            theme === "dark"
              ? "bg-slate-950 border-slate-900 text-slate-400 hover:text-white"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
          title={isExpanded ? "Colapsar menú" : "Expandir menú"}
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {isExpanded && <span className="text-[10px] uppercase font-bold tracking-wider">Minimizar</span>}
        </button>

        {/* User info & Signout */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700/50 flex items-center justify-center shrink-0 font-bold uppercase text-xs shadow-md">
            {user?.email?.charAt(0)}
          </div>
          {isExpanded && (
            <div className="overflow-hidden truncate flex-1 pr-2">
              <span
                className={`block text-[11px] font-bold truncate ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {user?.email}
              </span>
              <span className="block text-[9px] text-slate-500 truncate">Sesión activa</span>
            </div>
          )}
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 transition cursor-pointer shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
