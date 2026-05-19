"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { Expense } from "@/types";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";

export function useExpenses(userId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setExpenses(
          data.map((e: any) => ({
            ...e,
            amount: Number(e.amount),
          }))
        );
      }
    } catch (err: any) {
      console.error("Error fetching expenses:", err);
      toast.error("Error al cargar los gastos");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addExpense = async (payload: Omit<Expense, "id" | "user_id" | "created_at" | "paid_date">) => {
    if (!userId) return null;
    return withLoading(async () => {
      try {
        const newPayload = {
          user_id: userId,
          title: payload.title,
          amount: payload.amount,
          category: payload.category,
          type: payload.type,
          status: payload.status,
          due_date: payload.due_date || null,
          paid_date: payload.status === "paid" ? new Date().toISOString() : null,
        };

        const { data, error } = await insforge.database
          .from("expenses")
          .insert([newPayload])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const added: Expense = {
            ...data,
            amount: Number(data.amount),
          };
          setExpenses((prev) => [added, ...prev]);
          toast.success("Gasto registrado correctamente");
          return added;
        }
        return null;
      } catch (err: any) {
        console.error("Error adding expense:", err);
        toast.error("Error al registrar el gasto");
        return null;
      }
    }, "Registrando egreso...");
  };

  const updateExpense = async (id: string, payload: Partial<Omit<Expense, "id" | "user_id" | "created_at" | "paid_date">>) => {
    if (!userId) return null;
    return withLoading(async () => {
      try {
        const updatePayload: any = {
          ...payload,
          updated_at: new Date().toISOString(),
        };
        if (payload.status) {
          updatePayload.paid_date = payload.status === "paid" ? new Date().toISOString() : null;
        }

        const { data, error } = await insforge.database
          .from("expenses")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const updated: Expense = {
            ...data,
            amount: Number(data.amount),
          };
          setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
          toast.success("Gasto actualizado correctamente");
          return updated;
        }
        return null;
      } catch (err: any) {
        console.error("Error updating expense:", err);
        toast.error("Error al actualizar el gasto");
        return null;
      }
    }, "Actualizando información...");
  };

  const deleteExpense = async (id: string) => {
    return withLoading(async () => {
      try {
        const { error } = await insforge.database
          .from("expenses")
          .delete()
          .eq("id", id);

        if (error) throw error;

        setExpenses((prev) => prev.filter((e) => e.id !== id));
        toast.success("Gasto eliminado correctamente");
        return true;
      } catch (err: any) {
        console.error("Error deleting expense:", err);
        toast.error("Error al eliminar el gasto");
        return false;
      }
    }, "Eliminando transacción...");
  };

  const toggleExpenseStatus = async (expense: Expense) => {
    const updatedStatus = expense.status === "paid" ? "pending" : "paid";
    return updateExpense(expense.id, { status: updatedStatus });
  };

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleExpenseStatus,
    refetchExpenses: fetchExpenses,
  };
}
