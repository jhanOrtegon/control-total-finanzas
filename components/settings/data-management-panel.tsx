"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useFinance } from "@/providers/finance-provider";
import { clearUserData, seedMockData, exportBackup, importBackup } from "@/lib/data-management";
import { toast } from "sonner";
import { Database, Trash2, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";

export function DataManagementPanel() {
  const { user } = useAuth();
  const { refetchAll } = useFinance();
  const { theme } = useTheme();
  
  const [clearing, setClearing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkDevMode = () => {
      setIsDevMode(localStorage.getItem("developerMode") === "true");
    };
    
    checkDevMode();
    window.addEventListener("developerModeToggled", checkDevMode);
    
    return () => {
      window.removeEventListener("developerModeToggled", checkDevMode);
    };
  }, []);

  const handleClearData = async () => {
    if (!user) return;
    
    const confirmText = prompt("⚠️ ATENCIÓN: Esta acción borrará TODO tu historial de gastos, deudas y cierres de mes de forma irreversible.\n\nEscribe la palabra BORRAR en mayúsculas para confirmar:");
    if (confirmText !== "BORRAR") {
      toast.info("Operación cancelada. Tus datos están a salvo.");
      return;
    }

    setClearing(true);
    try {
      const ok = await clearUserData(user.id);
      if (ok) {
        toast.success("Todos los datos han sido borrados con éxito.");
        await refetchAll();
      } else {
        toast.error("Ocurrió un error al limpiar los datos.");
      }
    } catch (err) {
      toast.error("Error al limpiar datos.");
    } finally {
      setClearing(false);
    }
  };

  const handleSeedData = async () => {
    if (!user) return;
    
    const confirm = window.confirm("¿Estás seguro de inyectar datos de prueba? Esto primero borrará tus datos actuales y luego generará 2 años de historial simulado.");
    if (!confirm) return;

    setSeeding(true);
    try {
      const ok = await seedMockData(user.id);
      if (ok) {
        toast.success("Datos de prueba (2 años) generados con éxito.");
        await refetchAll();
      } else {
        toast.error("Ocurrió un error al generar los datos de prueba.");
      }
    } catch (err) {
      toast.error("Error al inyectar datos.");
    } finally {
      setSeeding(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await exportBackup(user.id);
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `control-total-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Copia de seguridad exportada con éxito.");
      } else {
        toast.error("Ocurrió un error al exportar.");
      }
    } catch (err) {
      toast.error("Error exportando backup.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const confirm = window.confirm("ATENCIÓN: Esto BORRARÁ tu base de datos actual y la REEMPLAZARÁ completamente con los datos del archivo. ¿Deseas continuar?");
    if (!confirm) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const ok = await importBackup(user.id, data);
      
      if (ok) {
        toast.success("Datos restaurados con éxito desde la copia de seguridad.");
        await refetchAll();
      } else {
        toast.error("Error al restaurar. El archivo podría ser inválido.");
      }
    } catch (err) {
      toast.error("Error leyendo o procesando el archivo de backup.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isDevMode) return null;

  return (
    <section className={`border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 mt-12 ${
      theme === "dark" ? "bg-slate-900/60 border-rose-900/30" : "bg-white border-rose-100"
    }`}>
      <div>
        <h2 className="text-lg font-black flex items-center gap-2 text-rose-500">
          <ShieldAlert className="w-6 h-6" />
          <span>Gestión de Datos y Pruebas (Zona Peligrosa)</span>
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
          Herramientas avanzadas para desarrolladores o para reiniciar tu cuenta. Acciones irreversibles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seed Data Button */}
        <div className={`p-5 rounded-2xl border ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-indigo-500">
            <Sparkles className="w-4 h-4" />
            Modo Simulador
          </h3>
          <p className="text-xs text-slate-500 mb-4 h-12">
            Inyecta automáticamente 2 años de historial realista (salarios, deudas, gastos y cierres de mes) para probar la app.
          </p>
          <button
            type="button"
            onClick={handleSeedData}
            disabled={seeding || clearing}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 text-sm"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {seeding ? "Generando 24 meses..." : "Inyectar Datos de Prueba"}
          </button>
        </div>

        {/* Clear Data Button */}
        <div className={`p-5 rounded-2xl border ${
          theme === "dark" ? "bg-slate-950/50 border-rose-900/30" : "bg-rose-50 border-rose-200"
        }`}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-rose-600">
            <Trash2 className="w-4 h-4" />
            Limpiar Cuenta
          </h3>
          <p className="text-xs text-slate-500 mb-4 h-12">
            Borra definitivamente todos los gastos, deudas, abonos e historial, devolviendo la cuenta a estado de fábrica.
          </p>
          <button
            type="button"
            onClick={handleClearData}
            disabled={seeding || clearing}
            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 text-sm"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {clearing ? "Borrando todo..." : "Borrar Todo el Historial"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Backup */}
        <div className={`p-5 rounded-2xl border ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-emerald-600">
            Exportar Respaldo
          </h3>
          <p className="text-xs text-slate-500 mb-4 h-12">
            Descarga un archivo .json con todas tus transacciones, configuraciones y deudas de forma segura.
          </p>
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={exporting || importing || clearing || seeding}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 text-sm"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {exporting ? "Exportando..." : "Descargar Backup (.json)"}
          </button>
        </div>

        {/* Import Backup */}
        <div className={`p-5 rounded-2xl border ${
          theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-amber-600">
            Importar Respaldo
          </h3>
          <p className="text-xs text-slate-500 mb-4 h-12">
            Restaura tu cuenta subiendo un archivo .json de respaldo. Esto sobrescribirá tus datos actuales.
          </p>
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportBackup} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || importing || clearing || seeding}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 text-sm"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {importing ? "Restaurando..." : "Subir Archivo de Backup"}
          </button>
        </div>
      </div>
    </section>
  );
}
