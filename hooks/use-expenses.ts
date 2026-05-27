"use client";

import { useState, useEffect, useCallback, useOptimistic, startTransition } from "react";
import { insforge } from "@/lib/insforge";
import { Expense } from "@/types";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";
import { formatCurrency } from "@/lib/utils";
import { broadcastMutation } from "@/lib/realtime-utils";

export function useExpenses(userId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();
  const MAX_TITLE_LENGTH = 255;
  const MAX_CATEGORY_LENGTH = 100;

  const clampText = (value: unknown, maxLength: number) => {
    const normalized = String(value ?? "").trim();
    return normalized.length > maxLength
      ? normalized.slice(0, maxLength)
      : normalized;
  };

  const [optimisticExpenses, addOptimisticExpense] = useOptimistic(
    expenses,
    (state: Expense[], newExpense: Expense) => {
      // Si el id es temporal o ya existe, actualizamos
      const exists = state.find(e => e.id === newExpense.id);
      if (exists) {
         return state.map(e => e.id === newExpense.id ? newExpense : e);
      }
      return [newExpense, ...state];
    }
  );

  const isPastMonth = useCallback((expense: Expense) => {
    let eMonth, eYear;
    if (expense.target_month) {
      const [y, m] = expense.target_month.split("-").map(Number);
      eMonth = m;
      eYear = y;
    } else {
      const dStr = expense.status === "paid" ? (expense.paid_date || expense.due_date) : (expense.due_date || expense.paid_date);
      if (!dStr) return false;
      const d = new Date(dStr);
      eMonth = d.getMonth() + 1;
      eYear = d.getFullYear();
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const expIndex = eYear * 12 + eMonth;
    const curIndex = currentYear * 12 + currentMonth;

    return expIndex < curIndex;
  }, []);

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

  const addExpense = async (payload: Omit<Expense, "id" | "user_id" | "created_at" | "paid_date"> & { paid_date?: string | null }) => {
    if (!userId) return null;
    const title = clampText(payload.title, MAX_TITLE_LENGTH);
    if (!title) {
      toast.error("El titulo del movimiento es obligatorio");
      return null;
    }

    const category = clampText(payload.category, MAX_CATEGORY_LENGTH) || "Otros";

    const newPayload = {
      user_id: userId,
      title,
      amount: payload.amount,
      category,
      type: payload.type,
      status: payload.status,
      target_month: payload.target_month || null,
      due_date: payload.due_date || null,
      paid_date: payload.status === "paid" ? payload.paid_date || new Date().toISOString() : null,
    };

    if (isPastMonth(newPayload as Expense)) {
      toast.error("No se pueden crear transacciones en meses anteriores al actual.");
      return null;
    }
    
    // Optimsitic inject
    const tempExpense: Expense = {
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...newPayload,
      amount: Number(newPayload.amount)
    };
    startTransition(() => {
      addOptimisticExpense(tempExpense);
    });

    try {
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
        toast.success(`✅ ${added.title}`, { description: `${formatCurrency(added.amount)} · ${added.category}` });
        broadcastMutation(userId, "INSERT_expense", added);
        return added;
      }
      return null;
    } catch (err: any) {
      console.error("Error adding expense:", err);
      toast.error("Error al registrar el gasto. Revirtiendo cambio...");
      // Revert base state to force re-render without optimistic (already happens automatically as state isn't updated)
      setExpenses([...expenses]); 
      return null;
    }
  };

  const updateExpense = async (id: string, payload: Partial<Omit<Expense, "id" | "user_id" | "created_at" | "paid_date"> & { paid_date?: string | null }>) => {
    if (!userId) return null;
    
    const existing = expenses.find((e) => e.id === id);
    if (existing && isPastMonth(existing)) {
      if (existing.status === "paid") {
        toast.error("El mes ya cerró: no puedes editar un gasto pagado en el pasado.");
        return null;
      }
      if (payload.status === "pending") {
        toast.error("El mes ya cerró: no puedes revertir un gasto a estado pendiente.");
        return null;
      }
    }

    return withLoading(async () => {
      try {
        const updatePayload: any = {
          ...payload,
          updated_at: new Date().toISOString(),
        };
        if (payload.status !== undefined) {
          updatePayload.paid_date = payload.status === "paid" ? (payload.paid_date || new Date().toISOString()) : null;
        } else if (payload.paid_date !== undefined) {
          updatePayload.paid_date = payload.paid_date;
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
          toast.success(`✏️ Actualizado: ${updated.title}`, { description: `${formatCurrency(updated.amount)} · ${updated.category}` });
          broadcastMutation(userId, "UPDATE_expense", updated);
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
    const existing = expenses.find((e) => e.id === id);
    if (existing && isPastMonth(existing) && existing.status === "paid") {
      toast.error("El mes ya cerró: no puedes eliminar un gasto pagado en el pasado.");
      return false;
    }

    return withLoading(async () => {
      try {
        const { error } = await insforge.database
          .from("expenses")
          .delete()
          .eq("id", id);

        if (error) throw error;

        setExpenses((prev) => prev.filter((e) => e.id !== id));
        toast.success("🗑️ Gasto eliminado");
        broadcastMutation(userId, "DELETE_expense", { id, title: "Gasto eliminado" });
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

  const applyRealtimeExpense = useCallback(
    (op: "INSERT" | "UPDATE" | "DELETE", data: Expense) => {
      setExpenses((prev) => {
        if (op === "DELETE") return prev.filter((e) => e.id !== data.id);
        const mapped: Expense = { ...data, amount: Number(data.amount) };
        if (op === "INSERT") {
          if (prev.some((e) => e.id === data.id)) return prev;
          return [mapped, ...prev];
        }
        return prev.map((e) => (e.id === data.id ? mapped : e));
      });
    },
    [],
  );

  return {
    expenses: optimisticExpenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    toggleExpenseStatus,
    refetchExpenses: fetchExpenses,
    applyRealtimeExpense,
  };
}
