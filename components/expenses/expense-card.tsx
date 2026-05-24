"use client";

import React, { useRef } from "react";
import { Expense } from "@/types";
import { useTheme } from "@/providers/theme-provider";
import { formatCurrency } from "@/lib/utils";
import { getCategoryEmoji, getCategoryColor } from "@/lib/constants";
import { Tag, Edit3, Trash2, Eye } from "lucide-react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { useDrag } from "@use-gesture/react";

interface ExpenseCardProps {
  expense: Expense;
  isEditing: boolean;
  onStartEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onViewDetail: (expense: Expense) => void;
}

export function ExpenseCard({
  expense,
  isEditing,
  onStartEdit,
  onDelete,
  onViewDetail,
}: ExpenseCardProps) {
  const { theme } = useTheme();
  
  // Controles de Framer Motion y Gestos
  const x = useMotionValue(0);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Mapeamos la X a la opacidad/color del fondo rojo
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  
  const bind = useDrag(({ active, movement: [mx], direction: [dx], cancel }) => {
    // Solo permitir deslizar a la izquierda (números negativos)
    if (mx > 0) return;
    
    if (active) {
      controls.start({ x: mx, transition: { type: "tween", duration: 0.1 } });
    } else {
      // Si soltó más allá del umbral (-100px)
      if (mx < -100) {
        controls.start({ x: -1000, transition: { type: "spring", stiffness: 200, damping: 20 } }).then(() => {
           onDelete(expense.id);
        });
      } else {
        controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
      }
    }
  }, { 
    axis: "x",
    rubberband: true,
  });

  return (
    <div className="relative overflow-hidden rounded-2xl w-full touch-pan-y" ref={containerRef}>
      
      {/* Fondo de acción (Eliminar) */}
      <motion.div 
        className="absolute inset-0 bg-rose-500 rounded-2xl flex justify-end items-center px-6"
        style={{ opacity: deleteOpacity }}
      >
        <span className="text-white font-bold flex items-center gap-2">
           <Trash2 className="w-5 h-5" /> Eliminar
        </span>
      </motion.div>

      {/* Tarjeta Principal (Deslizable) */}
      <motion.div
        {...(bind() as object)}
        animate={controls}
        style={{ x }}
        className={`border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition shadow-md relative group \${
          isEditing
            ? theme === "dark"
              ? "bg-indigo-950 border-indigo-500/70"
              : "bg-indigo-50 border-indigo-500/60"
            : theme === "dark"
            ? "bg-slate-900 border-slate-800/80"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto flex-1 min-w-0">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl border shrink-0 ${getCategoryColor(expense.category)}`}>
            {getCategoryEmoji(expense.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
              <h4 className={`text-sm font-bold group-hover:text-indigo-500 transition truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {expense.title}
              </h4>
              <span className={`self-start sm:self-auto text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                expense.type === "recurrent"
                  ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              }`}>
                {expense.type === "recurrent" ? "Fijo" : "Variable"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold truncate">
              <Tag className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{expense.category}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800/60 shrink-0 gap-3 mt-1 sm:mt-0">
          <div className="flex items-baseline gap-1 text-right">
            <span className={`text-base sm:text-lg font-black \${theme === "dark" ? "text-white" : "text-slate-950"}`}>
              {formatCurrency(expense.amount)}
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">COP</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onViewDetail(expense)}
              className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer \${
                theme === "dark"
                  ? "bg-slate-800 hover:bg-indigo-500/10 hover:text-indigo-400 border-slate-700/60 text-slate-400"
                  : "bg-slate-100 hover:bg-indigo-500/10 hover:text-indigo-500 border-slate-200 text-slate-500"
              }`}
              title="Ver Detalle"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={() => onStartEdit(expense)}
              className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer \${
                isEditing
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : theme === "dark"
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-400 hover:text-white"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 hover:text-slate-800"
              }`}
              title="Editar Gasto"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            
            <div className="hidden sm:block">
              <button
                onClick={() => onDelete(expense.id)}
                className={`p-2 rounded-lg border transition cursor-pointer \${
                  theme === "dark"
                    ? "bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 border-slate-700/60 hover:border-rose-500/20 text-slate-400"
                    : "bg-slate-100 hover:bg-rose-500/10 hover:text-rose-500 border-slate-200 hover:border-rose-500/20 text-slate-500"
                }`}
                title="Eliminar Gasto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
