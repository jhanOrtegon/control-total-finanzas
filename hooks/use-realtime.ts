"use client";

import { useEffect, useRef } from "react";
import { insforge } from "@/lib/insforge";
import type { Expense, Debt, UserBudget, CategoryBudget } from "@/types";

type RealtimeOp = "INSERT" | "UPDATE" | "DELETE";

interface RealtimeCallbacks {
  onExpenseChange: (op: RealtimeOp, data: Expense) => void;
  onDebtChange: (op: RealtimeOp, data: Debt) => void;
  onDebtPaymentChange?: (op: RealtimeOp, data: { id: string; debt_id: string; amount: number; balance_after: number }) => void;
  onBudgetChange: (data: UserBudget) => void;
  onCategoryBudgetChange: (op: RealtimeOp, data: CategoryBudget) => void;
  onSessionCount?: (count: number) => void;
}

export function useRealtime(
  userId: string | undefined,
  callbacks: RealtimeCallbacks,
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!userId) return;

    const channel = `finance:${userId}`;
    let active = true;

    const setup = async () => {
      try {
        if (!insforge.realtime.isConnected) {
          await insforge.realtime.connect();
        }

        const response = await insforge.realtime.subscribe(channel);

        if (!active) return;

        if (response.ok && response.presence) {
          cbRef.current.onSessionCount?.(response.presence.members.length);
        }

        const parsePayload = (raw: unknown): { operation: RealtimeOp; data: any } => {
          if (raw && typeof raw === "object" && "operation" in raw) {
            return raw as { operation: RealtimeOp; data: any };
          }
          return { operation: "UPDATE", data: raw };
        };

        insforge.realtime.on("INSERT_expense", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onExpenseChange("INSERT", data);
        });
        insforge.realtime.on("UPDATE_expense", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onExpenseChange("UPDATE", data);
        });
        insforge.realtime.on("DELETE_expense", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onExpenseChange("DELETE", data);
        });

        insforge.realtime.on("INSERT_debt", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtChange("INSERT", data);
        });
        insforge.realtime.on("UPDATE_debt", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtChange("UPDATE", data);
        });
        insforge.realtime.on("DELETE_debt", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtChange("DELETE", data);
        });

        insforge.realtime.on("INSERT_debt_payment", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtPaymentChange?.("INSERT", data);
        });

        insforge.realtime.on("UPDATE_budget", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onBudgetChange(data);
        });

        insforge.realtime.on("INSERT_category_budget", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onCategoryBudgetChange("INSERT", data);
        });
        insforge.realtime.on("UPDATE_category_budget", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onCategoryBudgetChange("UPDATE", data);
        });
        insforge.realtime.on("DELETE_category_budget", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onCategoryBudgetChange("DELETE", data);
        });

        insforge.realtime.on("presence:join", () =>
          cbRef.current.onSessionCount?.(
            (insforge.realtime as any)._presenceCount ?? 1,
          ),
        );
        insforge.realtime.on("presence:leave", () =>
          cbRef.current.onSessionCount?.(
            (insforge.realtime as any)._presenceCount ?? 1,
          ),
        );
      } catch (err) {
        if (active) {
          console.error("[Realtime] setup error:", err);
        }
      }
    };

    setup();

    return () => {
      active = false;
    };
  }, [userId]);
}
