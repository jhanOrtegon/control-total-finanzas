import { insforge } from "@/lib/insforge";

export function broadcastMutation(userId: string | undefined, eventName: string, data: any) {
  if (!userId) return;
  const channel = `finance:${userId}`;
  const operation = eventName.split("_")[0]; // "INSERT", "UPDATE", "DELETE"
  
  // 1. Native BroadcastChannel (instant for tabs in same browser, bypasses network)
  try {
    const bc = new BroadcastChannel(`finance-mutations-${userId}`);
    bc.postMessage({ eventName, operation, data });
    setTimeout(() => bc.close(), 100);
  } catch (err) {
    console.warn("BroadcastChannel failed", err);
  }

  // 2. WebSockets (cross-browser / device)
  if (insforge.realtime.isConnected) {
    insforge.realtime.publish(channel, eventName, { operation, data }).catch((err) => {
      console.error(`Failed to broadcast ${eventName}:`, err);
    });
  }
}
