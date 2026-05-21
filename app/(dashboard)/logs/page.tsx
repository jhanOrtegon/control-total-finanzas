"use client";

import React, { useMemo, useState } from "react";
import { useFinance } from "@/providers/finance-provider";
import { useTheme } from "@/providers/theme-provider";
import { Pagination } from "@/components/shared/pagination";
import { Search, Activity, Trash2, PlusCircle, Edit3, ArrowLeftRight, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Expense } from "@/types";
import { formatCurrency } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

function parseLog(rawTitle: string) {
  let actionType = "OTRO";
  let message = rawTitle.replace(/^LOG:\s*/, "");
  let details: any = null;

  if (rawTitle.includes("|||")) {
    const parts = rawTitle.split("|||");
    const prefix = parts[0];
    actionType = prefix.replace("LOG:", "");
    message = parts[1];
    if (parts.length > 2 && parts[2]) {
      try {
        details = JSON.parse(parts[2]);
      } catch (e) {}
    }
  } else {
    if (rawTitle.startsWith("LOG:CREAR")) actionType = "CREAR";
    else if (rawTitle.startsWith("LOG:ACTUALIZAR")) actionType = "ACTUALIZAR";
    else if (rawTitle.startsWith("LOG:ELIMINAR")) actionType = "ELIMINAR";
    else if (rawTitle.startsWith("LOG:ABONO")) actionType = "ABONO";
    else if (rawTitle.startsWith("LOG:REVERTIR ABONO")) actionType = "REVERTIR ABONO";
  }

  return { actionType, message, details };
}

function getLogIcon(actionType: string) {
  if (actionType === "CREAR") return <PlusCircle className="w-5 h-5 text-emerald-500" />;
  if (actionType === "ACTUALIZAR") return <Edit3 className="w-5 h-5 text-amber-500" />;
  if (actionType === "ELIMINAR") return <Trash2 className="w-5 h-5 text-rose-500" />;
  if (actionType === "ABONO" || actionType === "REVERTIR ABONO") return <ArrowLeftRight className="w-5 h-5 text-indigo-500" />;
  return <Activity className="w-5 h-5 text-slate-500" />;
}

function getLogColor(actionType: string, isDark: boolean) {
  if (actionType === "CREAR") return isDark ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer" : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer";
  if (actionType === "ACTUALIZAR") return isDark ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer" : "border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer";
  if (actionType === "ELIMINAR") return isDark ? "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer" : "border-rose-200 bg-rose-50 hover:bg-rose-100 cursor-pointer";
  if (actionType === "ABONO" || actionType === "REVERTIR ABONO") return isDark ? "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer" : "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 cursor-pointer";
  return isDark ? "border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 cursor-pointer" : "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer";
}

// Component to render JSON details gracefully
function DiffViewer({ details }: { details: any }) {
  if (!details) return null;

  if (details.old && details.new) {
    const keys = Array.from(new Set([...Object.keys(details.old), ...Object.keys(details.new)]));
    return (
      <div className="space-y-2 mt-4 text-sm">
        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b dark:border-slate-800 pb-1">Cambios detectados:</h4>
        <div className="grid grid-cols-3 gap-2 font-bold text-xs text-slate-500 dark:text-slate-400">
          <div>Campo</div>
          <div>Antes</div>
          <div>Ahora</div>
        </div>
        {keys.map((k) => {
          if (k === "updated_at") return null;
          const oldVal = details.old[k];
          const newVal = details.new[k];
          if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;

          return (
            <div key={k} className="grid grid-cols-3 gap-2 py-1.5 border-t dark:border-slate-800/50 items-center">
              <div className="font-semibold text-slate-600 dark:text-slate-300 truncate" title={k}>{k}</div>
              <div className="text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded truncate" title={String(oldVal ?? "N/A")}>{String(oldVal ?? "N/A")}</div>
              <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded truncate" title={String(newVal ?? "N/A")}>{String(newVal ?? "N/A")}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback for flat JSON details
  const keys = Object.keys(details).filter(k => k !== "updated_at" && details[k] !== null && details[k] !== undefined);
  if (keys.length === 0) return null;

  return (
    <div className="space-y-2 mt-4 text-sm">
      <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b dark:border-slate-800 pb-1">Datos Registrados:</h4>
      <div className="grid grid-cols-2 gap-2 font-bold text-xs text-slate-500 dark:text-slate-400">
        <div>Campo</div>
        <div>Valor</div>
      </div>
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-2 gap-2 py-1.5 border-t dark:border-slate-800/50 items-center">
          <div className="font-semibold text-slate-600 dark:text-slate-300 truncate" title={k}>{k}</div>
          <div className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded truncate" title={String(details[k])}>{String(details[k])}</div>
        </div>
      ))}
    </div>
  );
}

export default function LogsPage() {
  const { theme } = useTheme();
  const { expenses } = useFinance();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<{ raw: Expense; parsed: ReturnType<typeof parseLog> } | null>(null);

  const logs = useMemo(() => {
    return expenses
      .filter((e) => e.title.startsWith("LOG:"))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [expenses]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterType !== "all") {
      result = result.filter(l => {
        const { actionType } = parseLog(l.title);
        if (filterType === "crear") return actionType === "CREAR";
        if (filterType === "actualizar") return actionType === "ACTUALIZAR";
        if (filterType === "eliminar") return actionType === "ELIMINAR";
        if (filterType === "abono") return actionType === "ABONO" || actionType === "REVERTIR ABONO";
        return true;
      });
    }

    if (filterMonth !== "all" || filterYear !== "all") {
      result = result.filter(l => {
        const d = new Date(l.created_at);
        if (filterYear !== "all" && d.getFullYear().toString() !== filterYear) return false;
        if (filterMonth !== "all" && (d.getMonth() + 1).toString() !== filterMonth) return false;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const { message } = parseLog(l.title);
        return message.toLowerCase().includes(q);
      });
    }

    return result;
  }, [logs, search, filterMonth, filterYear, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const pageItems = filteredLogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <section className={`p-6 border rounded-3xl ${theme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-500" />
              Registro de Actividad
            </h2>
            <p className="text-sm text-slate-500 font-semibold mt-1">
              Historial detallado e inmutable de las operaciones. Haz clic para ver detalles.
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1.5 rounded-full">
            {logs.length} registros
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Select
            value={filterMonth}
            onValueChange={(val) => {
              setFilterMonth(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className={`w-[130px] rounded-xl py-2 text-xs font-bold ${
              theme === "dark" ? "bg-slate-950 border-slate-800 focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"
            }`}>
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  Mes {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="number"
            value={filterYear === "all" ? "" : filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value || "all");
              setPage(1);
            }}
            placeholder="Año (Todos)"
            className={`w-[110px] border rounded-xl py-2 px-3 text-xs font-bold transition ${
              theme === "dark" ? "bg-slate-950 border-slate-800 focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"
            }`}
          />

          <Select
            value={filterType}
            onValueChange={(val) => {
              setFilterType(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className={`w-[160px] rounded-xl py-2 text-xs font-bold ${
              theme === "dark" ? "bg-slate-950 border-slate-800 focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"
            }`}>
              <SelectValue placeholder="Tipo de Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              <SelectItem value="crear">Creaciones</SelectItem>
              <SelectItem value="actualizar">Ediciones</SelectItem>
              <SelectItem value="eliminar">Eliminaciones</SelectItem>
              <SelectItem value="abono">Abonos a Deuda</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por descripción..."
              className={`w-full border rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold transition ${
                theme === "dark" ? "bg-slate-950 border-slate-800 focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:border-indigo-400"
              }`}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {pageItems.length === 0 ? (
          <div className="p-12 text-center text-sm font-bold text-slate-500 border border-dashed rounded-3xl border-slate-300 dark:border-slate-800">
            No se encontraron registros de actividad.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 md:ml-6 space-y-6 pb-4">
            {pageItems.map((log) => {
              const parsed = parseLog(log.title);
              const isDark = theme === "dark";
              return (
                <div key={log.id} className="relative pl-6 md:pl-8 group">
                  <div className={`absolute -left-[17px] top-1.5 w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white dark:bg-slate-950 ${isDark ? "border-slate-900" : "border-slate-50"}`}>
                    <div className="bg-white dark:bg-slate-950 rounded-full p-1 shadow-sm">
                       {getLogIcon(parsed.actionType)}
                    </div>
                  </div>
                  <div 
                    onClick={() => setSelectedLog({ raw: log, parsed })}
                    className={`p-4 rounded-2xl border transition-all hover:shadow-md relative overflow-hidden ${getLogColor(parsed.actionType, isDark)}`}
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/80 dark:bg-black/40 p-2 rounded-full shadow-sm backdrop-blur-sm">
                        <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    </div>
                    <div className="pr-12">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                        {parsed.message}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-2 flex items-center gap-2">
                        <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/5">
                          {new Date(log.created_at).toLocaleString("es-CO")}
                        </span>
                        {parsed.details && (
                          <span className="bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                            Tiene detalles
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filteredLogs.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        )}
      </section>

      {/* Modal para Detalles del Log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
               {selectedLog && getLogIcon(selectedLog.parsed.actionType)}
               Detalle de la Actividad
            </DialogTitle>
            <DialogDescription>
              Información completa sobre el cambio registrado.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-bold mb-1">FECHA Y HORA</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {new Date(selectedLog.raw.created_at).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "medium" })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800">
                <p className="text-[11px] text-slate-500 font-bold mb-1">ACCIÓN PRINCIPAL</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedLog.parsed.message}
                </p>
              </div>

              {selectedLog.parsed.details && (
                 <DiffViewer details={selectedLog.parsed.details} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
