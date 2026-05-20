"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { MonthlySnapshot } from "@/types";
import type { MonthlyFinanceSummary } from "@/lib/finance-calculations";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";

function mapSnapshot(row: Record<string, unknown>): MonthlySnapshot {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    year: Number(row.year),
    month: Number(row.month),
    total_income: Number(row.total_income),
    total_spent: Number(row.total_spent),
    savings_goal: Number(row.savings_goal),
    total_outstanding_debt: Number(row.total_outstanding_debt),
    real_available_cash: Number(row.real_available_cash),
    dti_ratio: Number(row.dti_ratio),
    notes: row.notes ? String(row.notes) : null,
    closed_at: String(row.closed_at),
    created_at: String(row.created_at),
  };
}

export function useMonthlySnapshots(userId: string | undefined) {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();

  const fetchSnapshots = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from("monthly_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      if (data) setSnapshots(data.map((r) => mapSnapshot(r as Record<string, unknown>)));
    } catch (err) {
      console.error("Error fetching snapshots:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const closeMonth = async (
    month: number,
    year: number,
    summary: MonthlyFinanceSummary,
    notes?: string,
  ) => {
    if (!userId) return false;
    return withLoading(async () => {
      try {
        const payload = {
          user_id: userId,
          year,
          month,
          total_income: summary.totalIncome,
          total_spent: summary.monthSpent,
          savings_goal: summary.savingsGoal,
          total_outstanding_debt: summary.totalOutstandingDebt,
          real_available_cash: summary.realAvailableCash,
          dti_ratio: summary.dtiRatio,
          notes: notes || null,
          closed_at: new Date().toISOString(),
        };

        const existing = snapshots.find(
          (s) => s.year === year && s.month === month,
        );

        if (existing) {
          const { data, error } = await insforge.database
            .from("monthly_snapshots")
            .update(payload)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            const updated = mapSnapshot(data as Record<string, unknown>);
            setSnapshots((prev) =>
              prev.map((s) => (s.id === existing.id ? updated : s)),
            );
          }
        } else {
          const { data, error } = await insforge.database
            .from("monthly_snapshots")
            .insert([payload])
            .select()
            .single();
          if (error) throw error;
          if (data) {
            setSnapshots((prev) => [
              mapSnapshot(data as Record<string, unknown>),
              ...prev,
            ]);
          }
        }

        await fetchSnapshots();
        toast.success("Mes cerrado y guardado en tu historial");
        return true;
      } catch (err) {
        console.error("Error closing month:", err);
        toast.error("Error al cerrar el mes");
        return false;
      }
    }, "Cerrando mes…");
  };

  const getSnapshot = (month: number, year: number) =>
    snapshots.find((s) => s.month === month && s.year === year);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return {
    snapshots,
    loading,
    closeMonth,
    getSnapshot,
    refetchSnapshots: fetchSnapshots,
  };
}
