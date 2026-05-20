"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useFinance } from "@/providers/finance-provider";
import { formatCurrency } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/constants";
import { AlertOctagon, CalendarClock, Clock, CheckCircle2, Zap } from "lucide-react";

interface TodayUrgentPanelProps {
  selectedMonth: number;
  selectedYear: number;
  obligations: Array<{
    id: string;
    title: string;
    amount: number;
    category: string;
    isPaid: boolean;
    isDebt?: boolean;
    isIncome?: boolean;
    isRecurrentTemplate?: boolean;
    isOneTime?: boolean;
  }>;
}

export function TodayUrgentPanel({
  selectedMonth,
  selectedYear,
  obligations,
}: TodayUrgentPanelProps) {
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() + 1 === selectedMonth &&
    today.getFullYear() === selectedYear;

  const pending = useMemo(
    () => obligations.filter((ob) => !ob.isPaid && !ob.isIncome),
    [obligations]
  );

  // Only show panel if we're in the current month and there are pending items
  if (!isCurrentMonth || pending.length === 0) return null;

  const allPaid = pending.length === 0;
  const urgentCount = pending.length;
  const urgentAmount = pending.reduce((acc, ob) => acc + ob.amount, 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border p-5 space-y-4 bg-slate-900 dark:bg-slate-800 border-slate-800 dark:border-slate-700 text-slate-100 shadow-sm">
      {/* Decorative */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute right-0 bottom-0 w-24 h-24 rounded-full bg-black/10 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-300" />
            <h3 className="text-sm font-black">Pendientes de este mes</h3>
          </div>
          <p className="text-xs text-white/60 font-semibold">
            {today.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="flex gap-4">
          <div className="text-center bg-white/10 rounded-2xl px-4 py-2 border border-white/20">
            <p className="text-2xl font-black tabular-nums">{urgentCount}</p>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-wide">items</p>
          </div>
          <div className="text-center bg-white/10 rounded-2xl px-4 py-2 border border-white/20">
            <p className="text-lg font-black tabular-nums">{formatCurrency(urgentAmount)}</p>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-wide">por cubrir</p>
          </div>
        </div>
      </div>

      {/* Pending items list (max 4) */}
      <div className="relative z-10 space-y-2">
        {pending.slice(0, 4).map((ob) => (
          <div
            key={ob.id}
            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/10 border border-white/15"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">
                {ob.isDebt ? "💳" : getCategoryEmoji(ob.category)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{ob.title}</p>
                <p className="text-[10px] text-white/50 font-semibold">
                  {ob.isDebt ? "Cuota deuda" : ob.category}
                </p>
              </div>
            </div>
            <span className="text-sm font-black shrink-0 tabular-nums">
              {formatCurrency(ob.amount)}
            </span>
          </div>
        ))}
        {pending.length > 4 && (
          <p className="text-center text-[11px] text-white/60 font-bold pt-1">
            +{pending.length - 4} más en la lista
          </p>
        )}
      </div>
    </div>
  );
}
