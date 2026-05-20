"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { UserBudget } from "@/types";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";
import { formatCurrency } from "@/lib/utils";

export function useBudget(userId: string | undefined) {
  const [budget, setBudget] = useState<UserBudget | null>(null);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();

  const fetchBudget = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from("user_budgets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBudget({
          id: data.id,
          user_id: data.user_id,
          monthly_income: Number(data.monthly_income),
          monthly_budget: Number(data.monthly_budget),
          monthly_savings_goal: Number(data.monthly_savings_goal || 0),
        });
      } else {
        // Create initial budget if none exists
        const initial = {
          user_id: userId,
          monthly_income: 2000000, // Reasonable default COP
          monthly_budget: 1500000,
          monthly_savings_goal: 500000,
        };
        const { data: inserted, error: insertError } = await insforge.database
          .from("user_budgets")
          .insert([initial])
          .select()
          .single();

        if (insertError) throw insertError;
        if (inserted) {
          setBudget({
            id: inserted.id,
            user_id: inserted.user_id,
            monthly_income: Number(inserted.monthly_income),
            monthly_budget: Number(inserted.monthly_budget),
            monthly_savings_goal: Number(inserted.monthly_savings_goal || 0),
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching budget:", err);
      toast.error("Error al cargar la información del presupuesto");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateBudget = async (income: number, monthlyBudget: number, savingsGoal: number) => {
    if (!userId || !budget) return false;
    return withLoading(async () => {
      try {
        const { data, error } = await insforge.database
          .from("user_budgets")
          .update({
            monthly_income: income,
            monthly_budget: monthlyBudget,
            monthly_savings_goal: savingsGoal,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setBudget({
            id: data.id,
            user_id: data.user_id,
            monthly_income: Number(data.monthly_income),
            monthly_budget: Number(data.monthly_budget),
            monthly_savings_goal: Number(data.monthly_savings_goal || 0),
          });
          toast.success("⚙️ Configuración guardada", { description: `Ingreso: ${formatCurrency(income)} · Presupuesto: ${formatCurrency(monthlyBudget)}` });
          return true;
        }
        return false;
      } catch (err: any) {
        console.error("Error updating budget:", err);
        toast.error("Error al actualizar el presupuesto");
        return false;
      }
    }, "Guardando parámetros...");
  };

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const applyRealtimeBudget = useCallback((data: UserBudget) => {
    setBudget({
      id: data.id,
      user_id: data.user_id,
      monthly_income: Number(data.monthly_income),
      monthly_budget: Number(data.monthly_budget),
      monthly_savings_goal: Number(data.monthly_savings_goal || 0),
    });
  }, []);

  return {
    budget,
    loading,
    updateBudget,
    refetchBudget: fetchBudget,
    applyRealtimeBudget,
  };
}
