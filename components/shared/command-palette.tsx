"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";
import { toast } from "sonner";
import { CATEGORIES_LIST } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Search,
  Command,
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  PlusCircle,
  FileBarChart,
  ChevronRight,
  FolderMinus,
} from "lucide-react";

export function CommandPalette() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { addExpense, expenses, getMonthlySummary } = useFinance();
  const { month, year } = useFinancePeriod();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"search" | "expense" | "income">("search");

  // Form states for quick logs
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAmount, setQuickAmount] = useState<number | "">("");
  const [quickCategory, setQuickCategory] = useState("Comida");

  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Toggle command palette shortcut (Ctrl + K / Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setMode("search");
        setSearch("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, mode]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleExportCSV = () => {
    const currentMonth = month;
    const currentYear = year;
    const monthExpenses = expenses.filter((e) => {
      const refDate =
        e.status === "paid"
          ? e.paid_date || e.created_at
          : e.due_date || e.created_at;
      if (!refDate) return false;
      if (/^\d{4}-\d{2}-\d{2}$/.test(refDate)) {
        const [y, m] = refDate.split("-").map(Number);
        return y === currentYear && m === currentMonth;
      }
      const d = new Date(refDate);
      return (
        !isNaN(d.getTime()) &&
        d.getFullYear() === currentYear &&
        d.getMonth() + 1 === currentMonth
      );
    });

    const headers = ["Concepto", "Monto", "Categoría", "Tipo", "Estado", "Fecha"];
    const rows = monthExpenses.map((e) => [
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      e.type === "recurrent" ? "Fijo" : "Único",
      e.status === "paid" ? "Pagado" : "Pendiente",
      e.paid_date || e.due_date || e.created_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos-${currentYear}-${String(currentMonth).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📝 Descarga de CSV iniciada");
    setIsOpen(false);
  };

  const navItems = [
    { title: "Ir a Dashboard / Inicio", category: "Navegación", icon: "📊", action: () => router.push("/") },
    { title: "Ir a Control de Gastos", category: "Navegación", icon: "💸", action: () => router.push("/expenses") },
    { title: "Ir a Mis Deudas Activas", category: "Navegación", icon: "🚨", action: () => router.push("/debts") },
    { title: "Ir a Sobres por Categoría (Presupuesto)", category: "Navegación", icon: "📂", action: () => router.push("/budgets") },
    { title: "Ir a Ahorro y Estadísticas del Mes", category: "Navegación", icon: "🐷", action: () => router.push("/savings") },
    { title: "Ir a Cronograma de Pagos", category: "Navegación", icon: "📅", action: () => router.push("/schedule") },
    { title: "Ir a Asesor Economista Pro (IA)", category: "Navegación", icon: "🤖", action: () => router.push("/advisor") },
    { title: "Ir a Alertas y Vencimientos", category: "Navegación", icon: "🔔", action: () => router.push("/alerts") },
    { title: "Ir a Ajustes Generales", category: "Navegación", icon: "⚙️", action: () => router.push("/settings") },
  ];

  const actionItems = [
    { title: "Registrar Gasto Rápido", category: "Acción Rápida", icon: "➖", action: () => setMode("expense") },
    { title: "Registrar Ingreso Rápido", category: "Acción Rápida", icon: "➕", action: () => setMode("income") },
    {
      title: theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro",
      category: "Sistema",
      icon: theme === "dark" ? "☀️" : "🌙",
      action: () => {
        toggleTheme();
        toast.success(theme === "dark" ? "Modo Claro Activado" : "Modo Oscuro Activado");
        setIsOpen(false);
      },
    },
    { title: "Exportar Movimientos a CSV", category: "Acción Rápida", icon: "📥", action: handleExportCSV },
  ];

  const allItems = [...actionItems, ...navItems];

  const filteredItems = allItems.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: typeof allItems[0]) => {
    item.action();
    if (item.category === "Navegación") {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== "search") return; // Let input events process normally in form mode

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSaveQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickAmount) {
      toast.error("Por favor completa concepto y monto.");
      return;
    }
    const val = Number(quickAmount);
    if (isNaN(val) || val <= 0) {
      toast.error("Monto inválido.");
      return;
    }

    const success = await addExpense({
      title: quickTitle,
      amount: val,
      category: quickCategory,
      type: "one-time",
      status: "paid",
      due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    });

    if (success !== null) {
      toast.success(`Gasto registrado: ${quickTitle}`, { description: formatCurrency(val) });
      setQuickTitle("");
      setQuickAmount("");
      setIsOpen(false);
    }
  };

  const handleSaveQuickIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickAmount) {
      toast.error("Por favor completa concepto y monto.");
      return;
    }
    const val = Number(quickAmount);
    if (isNaN(val) || val <= 0) {
      toast.error("Monto inválido.");
      return;
    }

    const success = await addExpense({
      title: quickTitle,
      amount: val,
      category: "Ingresos",
      type: "one-time",
      status: "paid",
      due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    });

    if (success !== null) {
      toast.success(`Ingreso registrado: ${quickTitle}`, { description: formatCurrency(val) });
      setQuickTitle("");
      setQuickAmount("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    // Hidden triggers are not needed, but showing a subtle indicator in desktop can be useful.
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette Container */}
      <div
        ref={paletteRef}
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 flex flex-col max-h-[50vh] ${
          theme === "dark"
            ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/80"
            : "bg-white/95 border-slate-200 text-slate-950 shadow-slate-350/40"
        }`}
        onKeyDown={handleKeyDown}
      >
        {mode === "search" && (
          <>
            {/* Header Search Field */}
            <div className="flex items-center px-4 py-3 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Escribe un comando o navega... (ej: gasto, deudas)"
                className="flex-1 bg-transparent border-none text-sm font-semibold focus:outline-none focus:ring-0 placeholder-slate-400"
              />
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-200/40 dark:border-slate-800/50">
                <Command className="w-3.5 h-3.5" /> K
              </span>
            </div>

            {/* List Results */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar space-y-4">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-semibold">
                  No se encontraron comandos para tu búsqueda
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.title}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs text-left transition ${
                          isSelected
                            ? theme === "dark"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "border border-transparent hover:bg-slate-100 dark:hover:bg-slate-950/30"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-sm shrink-0">{item.icon}</span>
                          <div>
                            <span className="font-black block">{item.title}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mt-0.5">
                              {item.category}
                            </span>
                          </div>
                        </span>
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] text-slate-400 font-semibold flex justify-between items-center shrink-0 select-none">
              <span>Usa ↑ ↓ para navegar y Enter para ejecutar</span>
              <span>Esc para cerrar</span>
            </div>
          </>
        )}

        {mode === "expense" && (
          <form onSubmit={handleSaveQuickExpense} className="p-5 space-y-4 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2 shrink-0">
              <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" /> Registrar Gasto Variable Rápido
              </span>
              <button
                type="button"
                onClick={() => setMode("search")}
                className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Volver
              </button>
            </div>

            <div className="space-y-3 flex-1 min-h-0">
              {/* Concept */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Concepto</label>
                <input
                  type="text"
                  placeholder="Ej. Almuerzo rápido, Café..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full text-xs font-bold border rounded-xl py-2 px-3 focus:outline-none bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Monto ($)</label>
                <CurrencyInput
                  value={quickAmount === "" ? undefined : quickAmount}
                  onChange={(val) => setQuickAmount(val)}
                  placeholder="COP"
                  className="w-full text-xs font-bold border rounded-xl py-2 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Categoría</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CATEGORIES_LIST.filter((c) => c.name !== "Ingresos").map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setQuickCategory(c.name)}
                      className={`py-1.5 rounded-lg text-[9px] font-bold border transition ${
                        quickCategory === c.name
                          ? "bg-indigo-100 border-indigo-300 text-indigo-800 ring-2 ring-indigo-300/70"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {c.emoji} {c.name.slice(0, 5)}..
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save buttons */}
            <div className="pt-2 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMode("search")}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase border border-slate-200 dark:border-slate-800 text-slate-500 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
              >
                Guardar Gasto
              </button>
            </div>
          </form>
        )}

        {mode === "income" && (
          <form onSubmit={handleSaveQuickIncome} className="p-5 space-y-4 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2 shrink-0">
              <span className="text-xs font-black uppercase text-emerald-500 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" /> Registrar Ingreso Rápido
              </span>
              <button
                type="button"
                onClick={() => setMode("search")}
                className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Volver
              </button>
            </div>

            <div className="space-y-3 flex-1 min-h-0">
              {/* Concept */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Concepto</label>
                <input
                  type="text"
                  placeholder="Ej. Pago servicios, Venta..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="w-full text-xs font-bold border rounded-xl py-2 px-3 focus:outline-none bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase text-slate-500 tracking-wider">Monto ($)</label>
                <CurrencyInput
                  value={quickAmount === "" ? undefined : quickAmount}
                  onChange={(val) => setQuickAmount(val)}
                  placeholder="COP"
                  className="w-full text-xs font-bold border rounded-xl py-2 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Save buttons */}
            <div className="pt-2 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMode("search")}
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase border border-slate-200 dark:border-slate-800 text-slate-500 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
              >
                Guardar Ingreso
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
