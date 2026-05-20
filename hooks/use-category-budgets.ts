"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { CategoryBudget } from "@/types";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";
import { suggestEnvelopeLimits, SPEND_CATEGORIES } from "@/lib/envelope-calculations";
import { formatCurrency } from "@/lib/utils";
import { broadcastMutation } from "@/lib/realtime-utils";

function mapCategoryBudget(row: Record<string, unknown>): CategoryBudget {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    category: String(row.category),
    monthly_limit: Number(row.monthly_limit),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function useCategoryBudgets(userId: string | undefined) {
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();

  const fetchCategoryBudgets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from("category_budgets")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      if (data) {
        setCategoryBudgets(
          data.map((r) => mapCategoryBudget(r as Record<string, unknown>)),
        );
      }
    } catch (err) {
      console.error("Error fetching category budgets:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const upsertCategoryLimit = async (category: string, monthlyLimit: number) => {
    if (!userId) return false;
    return withLoading(async () => {
      try {
        const existing = categoryBudgets.find((c) => c.category === category);
        if (existing) {
          const { data, error } = await insforge.database
            .from("category_budgets")
            .update({
              monthly_limit: monthlyLimit,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            const updated = mapCategoryBudget(data as Record<string, unknown>);
            setCategoryBudgets((prev) =>
              prev.map((c) => (c.id === existing.id ? updated : c)),
            );
            broadcastMutation(userId, "UPDATE_category_budget", updated);
          }
        } else {
          const { data, error } = await insforge.database
            .from("category_budgets")
            .insert([
              {
                user_id: userId,
                category,
                monthly_limit: monthlyLimit,
              },
            ])
            .select()
            .single();
          if (error) throw error;
          if (data) {
            const mapped = mapCategoryBudget(data as Record<string, unknown>);
            setCategoryBudgets((prev) => [
              ...prev,
              mapped,
            ]);
            broadcastMutation(userId, "INSERT_category_budget", mapped);
          }
        }
        toast.success(`📁 Límite actualizado: ${category}`, { description: formatCurrency(monthlyLimit) });
        return true;
      } catch (err) {
        console.error("Error upserting category budget:", err);
        toast.error("Error al guardar el presupuesto de categoría");
        return false;
      }
    }, "Guardando sobres…");
  };

  const batchUpsertLimits = async (limits: Record<string, number>) => {
    if (!userId) return false;
    return withLoading(async () => {
      try {
        const { data: freshRows, error: fetchErr } = await insforge.database
          .from("category_budgets")
          .select("*")
          .eq("user_id", userId);
        if (fetchErr) throw fetchErr;
        const fresh = (freshRows ?? []).map((r) =>
          mapCategoryBudget(r as Record<string, unknown>),
        );

        for (const category of SPEND_CATEGORIES) {
          const monthlyLimit = limits[category] ?? 0;
          const existing = fresh.find((c) => c.category === category);
          if (existing) {
            const { data, error } = await insforge.database
              .from("category_budgets")
              .update({
                monthly_limit: monthlyLimit,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
              .select()
              .single();
            if (error) throw error;
            if (data) {
              const updated = mapCategoryBudget(data as Record<string, unknown>);
              setCategoryBudgets((prev) =>
                prev.map((c) => (c.id === existing.id ? updated : c)),
              );
              broadcastMutation(userId, "UPDATE_category_budget", updated);
            }
          } else if (monthlyLimit > 0) {
            const { data, error } = await insforge.database
              .from("category_budgets")
              .insert([
                { user_id: userId, category, monthly_limit: monthlyLimit },
              ])
              .select()
              .single();
            if (error) throw error;
            if (data) {
              const mapped = mapCategoryBudget(data as Record<string, unknown>);
              setCategoryBudgets((prev) => [
                ...prev,
                mapped,
              ]);
              broadcastMutation(userId, "INSERT_category_budget", mapped);
            }
          }
        }
        // fetchCategoryBudgets handles setting the final state, 
        // but we broadcasted individually so remote gets it instantly too
        await fetchCategoryBudgets();
        toast.success("📁 Todos los sobres guardados");
        return true;
      } catch (err) {
        console.error("Error batch upserting envelopes:", err);
        toast.error("Error al guardar los sobres");
        return false;
      }
    }, "Guardando todos los sobres…");
  };

  const applySuggestedEnvelopes = async (spendablePool: number) => {
    const suggested = suggestEnvelopeLimits(spendablePool);
    return batchUpsertLimits(suggested);
  };

  useEffect(() => {
    fetchCategoryBudgets();
  }, [fetchCategoryBudgets]);

  const applyRealtimeCategoryBudget = useCallback(
    (op: "INSERT" | "UPDATE" | "DELETE", data: CategoryBudget) => {
      setCategoryBudgets((prev) => {
        if (op === "DELETE") return prev.filter((c) => c.id !== data.id);
        const mapped = mapCategoryBudget(data as unknown as Record<string, unknown>);
        if (op === "INSERT") {
          if (prev.some((c) => c.id === data.id)) return prev;
          return [...prev, mapped];
        }
        return prev.map((c) => (c.id === data.id ? mapped : c));
      });
    },
    [],
  );

  return {
    categoryBudgets,
    loading,
    upsertCategoryLimit,
    batchUpsertLimits,
    applySuggestedEnvelopes,
    refetchCategoryBudgets: fetchCategoryBudgets,
    applyRealtimeCategoryBudget,
  };
}
