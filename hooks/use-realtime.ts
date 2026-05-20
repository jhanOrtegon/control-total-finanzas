"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { insforge } from "@/lib/insforge";
import type { ConnectionState } from "@insforge/sdk";
import type { Expense, Debt, UserBudget, CategoryBudget } from "@/types";

type RealtimeOp = "INSERT" | "UPDATE" | "DELETE";

interface RealtimeCallbacks {
  onExpenseChange: (op: RealtimeOp, data: Expense) => void;
  onDebtChange: (op: RealtimeOp, data: Debt) => void;
  onDebtPaymentChange?: (op: RealtimeOp, data: { id: string; debt_id: string; amount: number; balance_after: number }) => void;
  onBudgetChange: (data: UserBudget) => void;
  onCategoryBudgetChange: (op: RealtimeOp, data: CategoryBudget) => void;
  onSessionCount?: (count: number) => void;
  onRealtimeEvent?: (type: string, op: RealtimeOp, title?: string) => void;
}

export function useRealtime(
  userId: string | undefined,
  callbacks: RealtimeCallbacks,
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");

  const updateConnectionState = useCallback(() => {
    try {
      setConnectionState(insforge.realtime.connectionState);
    } catch {
      setConnectionState("disconnected");
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = `finance:${userId}`;
    let active = true;
    
    // Moved up here so it can be accessed inside setup() callbacks
    const myId = Math.random().toString(36).substring(2);
    const peers = new Set<string>();

    const reportCount = () => {
      if (active) {
        cbRef.current.onSessionCount?.(peers.size + 1);
      }
    };

    const setup = async () => {
      try {
        // Listen for connection lifecycle events
        insforge.realtime.on("connect", () => {
          if (active) setConnectionState("connected");
        });
        insforge.realtime.on("disconnect", () => {
          if (active) setConnectionState("disconnected");
        });
        insforge.realtime.on("connect_error", () => {
          if (active) setConnectionState("disconnected");
        });

        if (!insforge.realtime.isConnected) {
          setConnectionState("connecting");
          await insforge.realtime.connect();
        }

        if (active) setConnectionState("connected");

        const response = await insforge.realtime.subscribe(channel);

        if (!active) return;

        if (response.ok && response.presence) {
          cbRef.current.onSessionCount?.(response.presence.members.length);
        }

        const parsePayload = (raw: any): { operation: RealtimeOp; data: any } => {
          // If the backend wraps the broadcast in .payload
          if (raw && typeof raw === "object" && raw.payload) {
             raw = raw.payload;
          }
          if (raw && typeof raw === "object" && "operation" in raw) {
            return raw as { operation: RealtimeOp; data: any };
          }
          return { operation: "UPDATE", data: raw };
        };

        // Expenses
        insforge.realtime.on("INSERT_expense", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onExpenseChange("INSERT", data);
          cbRef.current.onRealtimeEvent?.("expense", "INSERT", data?.title);
        });
        insforge.realtime.on("UPDATE_expense", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onExpenseChange("UPDATE", data);
          cbRef.current.onRealtimeEvent?.("expense", "UPDATE", data?.title);
        });
        insforge.realtime.on("DELETE_expense", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onExpenseChange("DELETE", data);
          cbRef.current.onRealtimeEvent?.("expense", "DELETE", data?.title);
        });

        // Debts
        insforge.realtime.on("INSERT_debt", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtChange("INSERT", data);
          cbRef.current.onRealtimeEvent?.("debt", "INSERT", data?.title);
        });
        insforge.realtime.on("UPDATE_debt", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtChange("UPDATE", data);
          cbRef.current.onRealtimeEvent?.("debt", "UPDATE", data?.title);
        });
        insforge.realtime.on("DELETE_debt", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtChange("DELETE", data);
          cbRef.current.onRealtimeEvent?.("debt", "DELETE", data?.title);
        });

        // Debt payments
        insforge.realtime.on("INSERT_debt_payment", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onDebtPaymentChange?.("INSERT", data);
          cbRef.current.onRealtimeEvent?.("payment", "INSERT");
        });

        // Budget
        insforge.realtime.on("UPDATE_budget", (raw: unknown) => {
          const { data } = parsePayload(raw);
          cbRef.current.onBudgetChange(data);
          cbRef.current.onRealtimeEvent?.("budget", "UPDATE");
        });

        // Category budgets
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

        // Realtime event-based presence (fallback if backend supports it)
        insforge.realtime.on("presence:join", (payload: any) => {
           if (payload && typeof payload === "object" && typeof payload.count === "number") {
             // Let the custom presence handle counts mostly, but we can log or sync here if needed.
           }
        });

        // Custom cross-browser presence using WebSockets
        insforge.realtime.on("presence_ping", (msg: any) => {
           const id = msg?.payload?.id || msg?.id;
           if (id) {
             peers.add(id);
             reportCount();
             // Reply to the ping so the new client knows we exist
             if (active) {
               insforge.realtime.publish(channel, "presence_pong", { id: myId }).catch(()=>{});
             }
           }
        });

        insforge.realtime.on("presence_pong", (msg: any) => {
           const id = msg?.payload?.id || msg?.id;
           if (id) {
             peers.add(id);
             reportCount();
           }
        });

        insforge.realtime.on("presence_leave", (msg: any) => {
           const id = msg?.payload?.id || msg?.id;
           if (id) {
             peers.delete(id);
             reportCount();
           }
        });

      } catch (err) {
        if (active) {
          console.error("[Realtime] setup error:", err);
          setConnectionState("disconnected");
        }
      }
    };

    setup();

    // Cross-browser/device accurate tracking
    const bc = new BroadcastChannel(`finance-presence-${userId}`);
    
    const ping = () => {
      // Clear peers periodically so ghost sessions expire if they don't pong back
      peers.clear();
      
      // Local broadcast (same browser)
      bc.postMessage({ type: "ping", id: myId });
      
      // Remote broadcast (cross browser / cross device)
      if (insforge.realtime.isConnected) {
        insforge.realtime.publish(channel, "presence_ping", { id: myId }).catch(() => {});
      }
      
      setTimeout(reportCount, 300);
    };

    bc.onmessage = (e) => {
      if (e.data.type === "ping") {
        peers.add(e.data.id);
        bc.postMessage({ type: "pong", id: myId });
        reportCount();
      } else if (e.data.type === "pong") {
        peers.add(e.data.id);
        reportCount();
      } else if (e.data.type === "leave") {
        peers.delete(e.data.id);
        reportCount();
      }
    };

    ping();
    const presenceInterval = setInterval(ping, 10000); // Ping every 10s
    const connInterval = setInterval(updateConnectionState, 5000);
    
    // Local mutations BroadcastChannel listener
    const bcMutations = new BroadcastChannel(`finance-mutations-${userId}`);
    bcMutations.onmessage = (e) => {
      const { eventName, operation, data } = e.data;
      if (!active) return;
      
      switch (eventName) {
        case "INSERT_expense":
        case "UPDATE_expense":
        case "DELETE_expense":
          cbRef.current.onExpenseChange(operation as RealtimeOp, data);
          cbRef.current.onRealtimeEvent?.("expense", operation as RealtimeOp, data?.title);
          break;
        case "INSERT_debt":
        case "UPDATE_debt":
        case "DELETE_debt":
          cbRef.current.onDebtChange(operation as RealtimeOp, data);
          cbRef.current.onRealtimeEvent?.("debt", operation as RealtimeOp, data?.title);
          break;
        case "INSERT_debt_payment":
          cbRef.current.onDebtPaymentChange?.(operation as RealtimeOp, data);
          cbRef.current.onRealtimeEvent?.("payment", operation as RealtimeOp);
          break;
        case "UPDATE_budget":
          cbRef.current.onBudgetChange(data);
          cbRef.current.onRealtimeEvent?.("budget", "UPDATE");
          break;
        case "INSERT_category_budget":
        case "UPDATE_category_budget":
        case "DELETE_category_budget":
          cbRef.current.onCategoryBudgetChange(operation as RealtimeOp, data);
          break;
      }
    };

    return () => {
      active = false;
      
      // Notify local tabs
      bc.postMessage({ type: "leave", id: myId });
      bc.close();
      bcMutations.close();
      
      // Notify remote browsers
      if (insforge.realtime.isConnected) {
        insforge.realtime.publish(channel, "presence_leave", { id: myId }).catch(() => {});
      }
      
      clearInterval(presenceInterval);
      clearInterval(connInterval);
    };
  }, [userId, updateConnectionState]);

  return { connectionState };
}
