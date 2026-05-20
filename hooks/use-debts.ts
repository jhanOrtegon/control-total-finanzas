"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { Debt } from "@/types";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";
import { insertDebtPaymentRecord } from "@/hooks/use-debt-payments";
import { formatCurrency } from "@/lib/utils";
import { broadcastMutation } from "@/lib/realtime-utils";

export function useDebts(userId: string | undefined, onPaymentSuccess?: () => void) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();
  const currentYearMonth = new Date().toISOString().slice(0, 7);

  const fetchDebts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from("debts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setDebts(
          data.map((d: any) => ({
            ...d,
            total_amount: Number(d.total_amount),
            remaining_amount: Number(d.remaining_amount),
            minimum_payment: Number(d.minimum_payment || 0),
            installments: d.installments ? Number(d.installments) : 1,
            start_month: d.start_month || currentYearMonth,
          }))
        );
      }
    } catch (err: any) {
      console.error("Error fetching debts:", err);
      toast.error("Error al cargar las deudas");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addDebt = async (payload: Omit<Debt, "id" | "user_id" | "created_at">) => {
    if (!userId) return null;
    return withLoading(async () => {
      try {
        const newPayload = {
          user_id: userId,
          title: payload.title,
          total_amount: payload.total_amount,
          remaining_amount: payload.remaining_amount,
          minimum_payment: payload.minimum_payment,
          due_date: payload.due_date || null,
          installments:
            payload.installments && payload.installments > 0
              ? payload.installments
              : 1,
          start_month: payload.start_month || currentYearMonth,
        };

        const { data, error } = await insforge.database
          .from("debts")
          .insert([newPayload])
          .select("*")
          .single();

        if (error) throw error;

        if (data) {
          const added: Debt = {
            ...data,
            total_amount: Number(data.total_amount),
            remaining_amount: Number(data.remaining_amount),
            minimum_payment: Number(data.minimum_payment),
            installments: data.installments ? Number(data.installments) : 1,
            start_month: data.start_month || currentYearMonth,
          };
          setDebts((prev) => [added, ...prev]);
          toast.success(`💳 ${added.title}`, { description: `Total: ${formatCurrency(added.total_amount)}` });
          broadcastMutation(userId, "INSERT_debt", added);
          return added;
        }
        return null;
      } catch (err: any) {
        console.error("Error adding debt:", err);
        toast.error("Error al registrar la deudas");
        return null;
      }
    }, "Registrando deuda...");
  };

  const updateDebt = async (id: string, payload: Partial<Omit<Debt, "id" | "user_id" | "created_at">>) => {
    if (!userId) return null;
    return withLoading(async () => {
      try {
        const normalizedPayload = {
          ...payload,
          installments:
            payload.installments && payload.installments > 0
              ? payload.installments
              : 1,
          start_month: payload.start_month || currentYearMonth,
        };

        const { data, error } = await insforge.database
          .from("debts")
          .update(normalizedPayload)
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;

        if (data) {
          const updated: Debt = {
            ...data,
            total_amount: Number(data.total_amount),
            remaining_amount: Number(data.remaining_amount),
            minimum_payment: Number(data.minimum_payment),
            installments: data.installments ? Number(data.installments) : 1,
            start_month: data.start_month || currentYearMonth,
          };
          setDebts((prev) => prev.map((d) => (d.id === id ? updated : d)));
          toast.success(`✏️ Deuda actualizada: ${updated.title}`, { description: `Restante: ${formatCurrency(updated.remaining_amount)}` });
          broadcastMutation(userId, "UPDATE_debt", updated);
          return updated;
        }
        return null;
      } catch (err: any) {
        console.error("Error updating debt:", err);
        toast.error("Error al actualizar la deuda");
        return null;
      }
    }, "Actualizando deuda...");
  };

  const deleteDebt = async (id: string) => {
    return withLoading(async () => {
      try {
        const { error } = await insforge.database
          .from("debts")
          .delete()
          .eq("id", id);

        if (error) throw error;

        setDebts((prev) => prev.filter((d) => d.id !== id));
        toast.success("🗑️ Deuda eliminada");
        broadcastMutation(userId, "DELETE_debt", { id, title: "Deuda eliminada" });
        return true;
      } catch (err: any) {
        console.error("Error deleting debt:", err);
        toast.error("Error al eliminar la deuda");
        return false;
      }
    }, "Eliminando deuda...");
  };

  const recordDebtPayment = async (debtId: string, amount: number) => {
    if (!userId) return false;
    return withLoading(async () => {
      try {
        const debt = debts.find((d) => d.id === debtId);
        if (!debt) return false;

        const newRemaining = debt.remaining_amount - amount;

        const { data, error } = await insforge.database
          .from("debts")
          .update({ remaining_amount: newRemaining })
          .eq("id", debtId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const paidAt = new Date().toISOString();
          let expenseId: string | null = null;

          const { data: expData, error: expError } = await insforge.database
            .from("expenses")
            .insert([
              {
                user_id: userId,
                title: `Abono a deuda: ${debt.title}`,
                amount: amount,
                category: "Otros",
                type: "one-time",
                status: "paid",
                paid_date: paidAt,
                due_date: paidAt.slice(0, 10),
              },
            ])
            .select()
            .single();

          if (expError) {
            console.error("Error inserting auto expense:", expError);
          } else if (expData?.id) {
            expenseId = String(expData.id);
          }

          await insertDebtPaymentRecord({
            user_id: userId,
            debt_id: debtId,
            amount,
            balance_after: Number(data.remaining_amount),
            expense_id: expenseId,
            paid_at: paidAt,
          });

          setDebts((prev) =>
            prev.map((d) =>
              d.id === debtId
                ? { ...d, remaining_amount: Number(data.remaining_amount) }
                : d
            )
          );

          toast.success(`💰 Abono registrado: ${formatCurrency(amount)}`, { description: `Restante: ${formatCurrency(newRemaining)}` });

          broadcastMutation(userId, "UPDATE_debt", { ...debt, remaining_amount: Number(data.remaining_amount) });
          broadcastMutation(userId, "INSERT_debt_payment", { debt_id: debtId, amount, balance_after: Number(data.remaining_amount) });

          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
          return true;
        }
        return false;
      } catch (err: any) {
        console.error("Error recording debt payment:", err);
        toast.error("Error al registrar el abono");
        return false;
      }
    }, "Procesando abono a deuda...");
  };

  const undoDebtPayment = async (paymentId: string) => {
    if (!userId) return false;
    return withLoading(async () => {
      try {
        const { data: paymentData, error: paymentError } = await insforge.database
          .from("debt_payments")
          .select("id, debt_id, amount, expense_id")
          .eq("id", paymentId)
          .eq("user_id", userId)
          .single();

        if (paymentError || !paymentData) {
          throw paymentError ?? new Error("No se encontró el abono a revertir");
        }

        const paymentDebtId = String(paymentData.debt_id);
        const paymentAmount = Number(paymentData.amount);
        const paymentExpenseId = paymentData.expense_id
          ? String(paymentData.expense_id)
          : null;

        const debtInState = debts.find((d) => d.id === paymentDebtId);

        let currentRemaining = debtInState?.remaining_amount;
        let debtTotal = debtInState?.total_amount;
        let debtTitle = debtInState?.title;

        if (
          currentRemaining === undefined ||
          debtTotal === undefined ||
          debtTitle === undefined
        ) {
          const { data: debtRow, error: debtErr } = await insforge.database
            .from("debts")
            .select("id, title, remaining_amount, total_amount")
            .eq("id", paymentDebtId)
            .eq("user_id", userId)
            .single();

          if (debtErr || !debtRow) {
            throw debtErr ?? new Error("No se encontró la deuda asociada");
          }

          currentRemaining = Number(debtRow.remaining_amount);
          debtTotal = Number(debtRow.total_amount);
          debtTitle = String(debtRow.title);
        }

        const newRemaining = Math.min(debtTotal, currentRemaining + paymentAmount);

        const { data: updatedDebtRow, error: updateDebtError } = await insforge.database
          .from("debts")
          .update({ remaining_amount: newRemaining })
          .eq("id", paymentDebtId)
          .eq("user_id", userId)
          .select("id, title, total_amount, remaining_amount, minimum_payment, due_date, installments, start_month, created_at, user_id")
          .single();

        if (updateDebtError || !updatedDebtRow) {
          throw updateDebtError ?? new Error("No se pudo actualizar la deuda");
        }

        const { error: deletePaymentError } = await insforge.database
          .from("debt_payments")
          .delete()
          .eq("id", paymentId)
          .eq("user_id", userId);

        if (deletePaymentError) {
          throw deletePaymentError;
        }

        if (paymentExpenseId) {
          const { error: deleteExpenseError } = await insforge.database
            .from("expenses")
            .delete()
            .eq("id", paymentExpenseId)
            .eq("user_id", userId);

          if (deleteExpenseError) {
            console.warn("No se pudo eliminar el gasto asociado al abono:", deleteExpenseError);
          }
        }

        const updatedDebt: Debt = {
          id: String(updatedDebtRow.id),
          user_id: String(updatedDebtRow.user_id),
          title: String(updatedDebtRow.title),
          total_amount: Number(updatedDebtRow.total_amount),
          remaining_amount: Number(updatedDebtRow.remaining_amount),
          minimum_payment: Number(updatedDebtRow.minimum_payment || 0),
          due_date: updatedDebtRow.due_date ? String(updatedDebtRow.due_date) : null,
          installments: updatedDebtRow.installments
            ? Number(updatedDebtRow.installments)
            : null,
          start_month: updatedDebtRow.start_month
            ? String(updatedDebtRow.start_month)
            : null,
          created_at: String(updatedDebtRow.created_at),
        };

        setDebts((prev) =>
          prev.map((d) => (d.id === paymentDebtId ? updatedDebt : d))
        );

        toast.success(`↩️ Abono revertido en ${debtTitle}`, {
          description: `Saldo actualizado: ${formatCurrency(newRemaining)}`,
        });

        broadcastMutation(userId, "UPDATE_debt", updatedDebt);
        broadcastMutation(userId, "DELETE_debt_payment", {
          id: paymentId,
          debt_id: paymentDebtId,
          title: `Reversa: ${debtTitle}`,
        });

        return true;
      } catch (err: any) {
        console.error("Error undoing debt payment:", err);
        toast.error("Error al deshacer el abono");
        return false;
      }
    }, "Revirtiendo abono de deuda...");
  };

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const applyRealtimeDebt = useCallback(
    (op: "INSERT" | "UPDATE" | "DELETE", data: Debt) => {
      setDebts((prev) => {
        if (op === "DELETE") return prev.filter((d) => d.id !== data.id);
        const mapped: Debt = {
          ...data,
          total_amount: Number(data.total_amount),
          remaining_amount: Number(data.remaining_amount),
          minimum_payment: Number(data.minimum_payment || 0),
          installments: data.installments ? Number(data.installments) : 1,
          start_month: data.start_month || currentYearMonth,
        };
        if (op === "INSERT") {
          if (prev.some((d) => d.id === data.id)) return prev;
          return [mapped, ...prev];
        }
        return prev.map((d) => (d.id === data.id ? mapped : d));
      });
    },
    [currentYearMonth],
  );

  return {
    debts,
    loading,
    addDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    undoDebtPayment,
    refetchDebts: fetchDebts,
    applyRealtimeDebt,
  };
}
