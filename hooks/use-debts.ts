"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { Debt } from "@/types";
import { toast } from "sonner";
import { useGlobalLoading } from "@/providers/loading-provider";
import { insertDebtPaymentRecord } from "@/hooks/use-debt-payments";
import { formatCurrency } from "@/lib/utils";

const OPTIONAL_DEBT_COLUMNS = ["installments", "start_month"] as const;

const isMissingDebtColumnError = (err: any, column: (typeof OPTIONAL_DEBT_COLUMNS)[number]) => {
  return err?.code === "PGRST204" && typeof err?.message === "string" && err.message.includes(`'${column}'`);
};

const stripOptionalDebtColumns = <T extends Record<string, any>>(payload: T) => {
  const next = { ...payload };
  for (const column of OPTIONAL_DEBT_COLUMNS) {
    delete next[column];
  }
  return next;
};

export function useDebts(userId: string | undefined, onPaymentSuccess?: () => void) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);
  const { withLoading } = useGlobalLoading();

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
            installments: d.installments ? Number(d.installments) : null,
            start_month: d.start_month || null,
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
          installments: payload.installments || null,
          start_month: payload.start_month || null,
        };

        const { data, error } = await insforge.database
          .from("debts")
          .insert([newPayload])
          .select()
          .single();

        let finalData = data;
        if (error) {
          const shouldRetryWithoutOptionalColumns = OPTIONAL_DEBT_COLUMNS.some((column) =>
            isMissingDebtColumnError(error, column)
          );

          if (!shouldRetryWithoutOptionalColumns) throw error;

          const { data: fallbackData, error: fallbackError } = await insforge.database
            .from("debts")
            .insert([stripOptionalDebtColumns(newPayload)])
            .select()
            .single();

          if (fallbackError) throw fallbackError;
          finalData = fallbackData;
        }

        if (finalData) {
          const added: Debt = {
            ...finalData,
            total_amount: Number(finalData.total_amount),
            remaining_amount: Number(finalData.remaining_amount),
            minimum_payment: Number(finalData.minimum_payment),
            installments: finalData.installments ? Number(finalData.installments) : null,
            start_month: finalData.start_month || null,
          };
          setDebts((prev) => [added, ...prev]);
          toast.success(`💳 ${added.title}`, { description: `Total: ${formatCurrency(added.total_amount)}` });
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
        const { data, error } = await insforge.database
          .from("debts")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        let finalData = data;
        if (error) {
          const shouldRetryWithoutOptionalColumns = OPTIONAL_DEBT_COLUMNS.some((column) =>
            isMissingDebtColumnError(error, column)
          );

          if (!shouldRetryWithoutOptionalColumns) throw error;

          const { data: fallbackData, error: fallbackError } = await insforge.database
            .from("debts")
            .update(stripOptionalDebtColumns(payload))
            .eq("id", id)
            .select()
            .single();

          if (fallbackError) throw fallbackError;
          finalData = fallbackData;
        }

        if (finalData) {
          const updated: Debt = {
            ...finalData,
            total_amount: Number(finalData.total_amount),
            remaining_amount: Number(finalData.remaining_amount),
            minimum_payment: Number(finalData.minimum_payment),
            installments: finalData.installments ? Number(finalData.installments) : null,
            start_month: finalData.start_month || null,
          };
          setDebts((prev) => prev.map((d) => (d.id === id ? updated : d)));
          toast.success(`✏️ Deuda actualizada: ${updated.title}`, { description: `Restante: ${formatCurrency(updated.remaining_amount)}` });
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
          installments: data.installments ? Number(data.installments) : null,
          start_month: data.start_month || null,
        };
        if (op === "INSERT") {
          if (prev.some((d) => d.id === data.id)) return prev;
          return [mapped, ...prev];
        }
        return prev.map((d) => (d.id === data.id ? mapped : d));
      });
    },
    [],
  );

  return {
    debts,
    loading,
    addDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    refetchDebts: fetchDebts,
    applyRealtimeDebt,
  };
}
