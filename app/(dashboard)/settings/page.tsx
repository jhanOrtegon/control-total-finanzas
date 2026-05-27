"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFinance } from "@/providers/finance-provider";
import { Settings, Save, Plus, Trash2, Briefcase, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { PoolBalanceBanner } from "@/components/budgets/pool-balance-banner";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insforge } from "@/lib/insforge";
import { DataManagementPanel } from "@/components/settings/data-management-panel";

export default function SettingsPage() {
  const { user } = useAuth();
  const { budget, updateBudget, budgetLoading, expenses, refetchAll } = useFinance();

  const [profileType, setProfileType] = useState<string>("empleado");
  const [contractType, setContractType] = useState<string>("indefinido");
  const [yearlyConfigs, setYearlyConfigs] = useState<{ year: number; income: number; budget: number; savingsGoal: number; id?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // Sync inputs with budget data & extract CONFIG expenses
  useEffect(() => {
    setIsDeveloperMode(localStorage.getItem("developerMode") === "true");

    const handleToggle = () => {
      setIsDeveloperMode(localStorage.getItem("developerMode") === "true");
    };

    window.addEventListener("developerModeToggled", handleToggle);
    return () => window.removeEventListener("developerModeToggled", handleToggle);
  }, []);

  useEffect(() => {
    let pType = "empleado";
    let cType = "indefinido";
    const configsMap = new Map<number, { year: number; income: number; budget: number; savingsGoal: number; id?: string }>();
    
    const getOrAddYear = (y: number) => {
      if (!configsMap.has(y)) {
        configsMap.set(y, { year: y, income: 0, budget: 0, savingsGoal: 0 });
      }
      return configsMap.get(y)!;
    };

    expenses.forEach(e => {
      if (e.title === "CONFIG:PROFILE_TYPE") pType = e.category;
      if (e.title === "CONFIG:CONTRACT_TYPE") cType = e.category;
      
      const parts = e.title.split(":");
      if (parts[0] === "CONFIG" && parts.length >= 3) {
        const year = parseInt(parts[2]);
        if (!isNaN(year)) {
          const cfg = getOrAddYear(year);
          if (parts[1] === "SALARY") cfg.income = e.amount;
          if (parts[1] === "BUDGET") cfg.budget = e.amount;
          if (parts[1] === "SAVINGS") cfg.savingsGoal = e.amount;
        }
      }
    });

    const currentYear = new Date().getFullYear();
    if (configsMap.size === 0 && budget) {
      getOrAddYear(currentYear).income = budget.monthly_income > 0 ? budget.monthly_income : 0;
      getOrAddYear(currentYear).budget = budget.monthly_budget > 0 ? budget.monthly_budget : 0;
      getOrAddYear(currentYear).savingsGoal = budget.monthly_savings_goal > 0 ? budget.monthly_savings_goal : 0;
    }

    const configs = Array.from(configsMap.values()).sort((a, b) => b.year - a.year);
    
    setProfileType(pType);
    setContractType(cType);
    setYearlyConfigs(configs);
  }, [budget, expenses]);

  const addYear = () => {
    const nextYear = yearlyConfigs.length > 0 ? Math.max(...yearlyConfigs.map(s => s.year)) + 1 : new Date().getFullYear();
    setYearlyConfigs([{ year: nextYear, income: 0, budget: 0, savingsGoal: 0 }, ...yearlyConfigs].sort((a, b) => b.year - a.year));
  };

  const removeYear = (idx: number) => {
    const newConfigs = [...yearlyConfigs];
    newConfigs.splice(idx, 1);
    setYearlyConfigs(newConfigs);
  };

  const updateYearConfig = (idx: number, field: keyof typeof yearlyConfigs[0], val: number) => {
    const newConfigs = [...yearlyConfigs];
    newConfigs[idx] = { ...newConfigs[idx], [field as any]: val };
    setYearlyConfigs(newConfigs);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const currentYear = new Date().getFullYear();
      const latestConfig = yearlyConfigs.find(s => s.year === currentYear) || yearlyConfigs[0];
      
      const latestSalary = latestConfig?.income || 0;
      const latestBudget = latestConfig?.budget || 0;
      const latestSavings = latestConfig?.savingsGoal || 0;

      // 1. Save standard budget limits (fallback/global)
      await updateBudget(latestSalary, latestBudget, latestSavings);

      // 2. Clear old config silently & write new ones
      if (budget?.user_id) {
        const oldIds = expenses.filter(ex => ex.title.startsWith("CONFIG:")).map(ex => ex.id);
        
        for (const id of oldIds) {
          await insforge.database.from("expenses").delete().eq("id", id);
        }

        const newConfigs = [
          { user_id: budget.user_id, title: "CONFIG:PROFILE_TYPE", amount: 0, category: profileType, type: "one-time", status: "paid" },
          { user_id: budget.user_id, title: "CONFIG:CONTRACT_TYPE", amount: 0, category: contractType, type: "one-time", status: "paid" }
        ];

        yearlyConfigs.forEach(s => {
          if (s.income > 0) {
            newConfigs.push({
              user_id: budget.user_id,
              title: `CONFIG:SALARY:${s.year}`,
              amount: s.income,
              category: "SYSTEM",
              type: "one-time",
              status: "paid"
            });
          }
          if (s.budget > 0) {
            newConfigs.push({
              user_id: budget.user_id,
              title: `CONFIG:BUDGET:${s.year}`,
              amount: s.budget,
              category: "SYSTEM",
              type: "one-time",
              status: "paid"
            });
          }
          if (s.savingsGoal > 0) {
            newConfigs.push({
              user_id: budget.user_id,
              title: `CONFIG:SAVINGS:${s.year}`,
              amount: s.savingsGoal,
              category: "SYSTEM",
              type: "one-time",
              status: "paid"
            });
          }
        });

        await insforge.database.from("expenses").insert(newConfigs);
        await refetchAll();
        toast.success("✅ Configuración de perfil y métricas anuales actualizada correctamente.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error al guardar la configuración.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    if (newClicks >= 5) {
      const isDev = localStorage.getItem("developerMode") === "true";
      if (!isDev) {
        localStorage.setItem("developerMode", "true");
        toast.success("🔓 ¡Zona Peligrosa desbloqueada!");
        setIsDeveloperMode(true);
      } else {
        localStorage.setItem("developerMode", "false");
        toast.success("🔒 Zona Peligrosa oculta.");
        setIsDeveloperMode(false);
      }
      setLogoClicks(0);
      window.dispatchEvent(new Event("developerModeToggled"));
    }
  };

  const isSaving = loading || budgetLoading;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PoolBalanceBanner />
      
      <section className="border rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        {/* Mi Perfil / User Icon for Easter Egg */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogoClick}
            className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold uppercase text-lg shadow-md cursor-pointer transition active:scale-95"
            title="Logo de Usuario"
          >
            {user?.email?.charAt(0) || <User className="w-6 h-6" />}
          </button>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Sesión Activa</h3>
            <p className="text-xs text-slate-500 font-semibold">{user?.email || "Usuario"}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-500" />
            <span>Configuración Financiera</span>
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
            Parametriza tus perfiles de ingresos, configuración anual y metas de ahorro. Estos datos definen cómo calcularemos tus proyecciones y flujos de caja.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">

          {/* PERFIL SECTION */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Briefcase className="w-4 h-4 text-emerald-500" />
              Perfil Profesional
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Tipo de Perfil
                </label>
                <Select value={profileType} onValueChange={(val) => setProfileType(val as string)}>
                  <SelectTrigger className="w-full border rounded-xl py-6 px-3 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Tipo de Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="independiente">Independiente</SelectItem>
                    <SelectItem value="desempleado">Desempleado / Solo Gastos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {profileType === "empleado" && (
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Tipo de Contrato
                  </label>
                  <Select value={contractType} onValueChange={(val) => setContractType(val as string)}>
                    <SelectTrigger className="w-full border rounded-xl py-6 px-3 focus:outline-none focus:border-indigo-500 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Tipo de Contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Término Indefinido</SelectItem>
                      <SelectItem value="fijo">Término Fijo</SelectItem>
                      <SelectItem value="prestacion_servicios">Prestación de Servicios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {profileType === "empleado" && (contractType === "indefinido" || contractType === "fijo") ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                Se calcularán automáticamente las <strong>Primas Legales</strong> (medio salario) sumadas a tus ingresos en los meses de Julio y Enero.
              </p>
            ) : profileType !== "desempleado" ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                Bajo este perfil, <strong>no</strong> se calcularán primas automáticas en julio y enero.
              </p>
            ) : null}
          </div>

          {/* YEARLY CONFIG SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Configuración Financiera (Por Año)
              </h3>
              <button
                type="button"
                onClick={addYear}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-2 py-1 rounded-lg transition"
              >
                <Plus className="w-3 h-3" />
                Agregar Año
              </button>
            </div>

            {yearlyConfigs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No has configurado ingresos ni metas. Haz clic en "Agregar Año".</p>
            ) : (
              <div className="space-y-4">
                {yearlyConfigs.map((s, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative group">
                    <button
                      type="button"
                      onClick={() => removeYear(idx)}
                      className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"
                      title="Eliminar este año"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="w-full sm:w-24">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Año</label>
                      <input
                        type="number"
                        value={s.year}
                        onChange={(e) => updateYearConfig(idx, "year", parseInt(e.target.value))}
                        className="w-full bg-white dark:bg-slate-950 font-black text-indigo-500 text-center border border-slate-200 dark:border-slate-800 rounded-lg py-2 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {profileType !== "desempleado" && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Salario</label>
                          <CurrencyInput
                            value={s.income === 0 ? undefined : s.income}
                            onChange={(val) => updateYearConfig(idx, "income", val as number)}
                            placeholder="Mensual..."
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 focus:outline-none text-sm font-bold"
                          />
                        </div>
                      )}
                      
                      <div className={profileType === "desempleado" ? "col-span-2 sm:col-span-1" : ""}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Presupuesto</label>
                        <CurrencyInput
                          value={s.budget === 0 ? undefined : s.budget}
                          onChange={(val) => updateYearConfig(idx, "budget", val as number)}
                          placeholder="Límite..."
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 focus:outline-none text-sm font-bold"
                        />
                      </div>
                      
                      <div className={profileType === "desempleado" ? "col-span-2 sm:col-span-1" : ""}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ahorro</label>
                        <CurrencyInput
                          value={s.savingsGoal === 0 ? undefined : s.savingsGoal}
                          onChange={(val) => updateYearConfig(idx, "savingsGoal", val as number)}
                          placeholder="Meta..."
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 focus:outline-none text-sm font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? "Guardando..." : "Guardar Parámetros"}</span>
            </button>
          </div>
        </form>
      </section>

      <div className={isDeveloperMode ? "block" : "hidden"}>
        <DataManagementPanel />
      </div>
    </div>
  );
}
