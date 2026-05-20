"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BarChart3, Layers, ShieldAlert, Calendar, TrendingUp, LineChart, History, FileBarChart, Sparkles, Bell, Settings, Wallet } from "lucide-react";
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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
      >
        <Menu className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col md:hidden ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="font-bold">Menú</div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {navGroups.map((g) => (
          <div key={g.title}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{g.title}</div>
            <div className="grid grid-cols-2 gap-2">
              {g.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold ${
                      isActive
                        ? "bg-indigo-500 text-white"
                        : theme === "dark" ? "bg-slate-900 text-slate-300" : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
