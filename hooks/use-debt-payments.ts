"use client";

import { useState, useEffect, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import { DebtPayment } from "@/types";
import { toast } from "sonner";

function mapPayment(row: Record<string, unknown>): DebtPayment {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    debt_id: String(row.debt_id),
    amount: Number(row.amount),
    balance_after: Number(row.balance_after),
    expense_id: row.expense_id ? String(row.expense_id) : null,
    paid_at: String(row.paid_at),
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at),
  };
}

export function useDebtPayments(userId: string | undefined) {
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from("debt_payments")
        .select("*")
        .eq("user_id", userId)
        .order("paid_at", { ascending: false });

      if (error) throw error;
      if (data) setPayments(data.map((r) => mapPayment(r as Record<string, unknown>)));
    } catch (err) {
      console.error("Error fetching debt payments:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { payments, loading, refetchPayments: fetchPayments };
}

export async function insertDebtPaymentRecord(payload: {
  user_id: string;
  debt_id: string;
  amount: number;
  balance_after: number;
  expense_id?: string | null;
  note?: string | null;
  paid_at?: string;
}): Promise<DebtPayment | null> {
  try {
    const { data, error } = await insforge.database
      .from("debt_payments")
      .insert([
        {
          user_id: payload.user_id,
          debt_id: payload.debt_id,
          amount: payload.amount,
          balance_after: payload.balance_after,
          expense_id: payload.expense_id ?? null,
          note: payload.note ?? null,
          paid_at: payload.paid_at ?? new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (data) return mapPayment(data as Record<string, unknown>);
    return null;
  } catch (err) {
    console.error("Error inserting debt payment:", err);
    toast.error("No se pudo registrar el abono en el historial");
    return null;
  }
}
