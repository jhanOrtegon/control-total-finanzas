"use client";

import { useEffect, useRef } from "react";
import { useOffline } from "@/hooks/use-offline";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const isOffline = useOffline();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (isOffline) {
      toast("Estás sin conexión a Internet", {
        icon: <WifiOff className="w-4 h-4 text-rose-500" />,
        description: "Control Total Finanzas sigue funcionando, pero los cambios se guardarán cuando recuperes la conexión.",
        duration: 8000,
        position: "top-center",
        id: "offline-toast",
      });
      wasOffline.current = true;
    } else if (wasOffline.current) {
      toast.dismiss("offline-toast");
      toast.success("Conexión restaurada", {
        icon: <Wifi className="w-4 h-4 text-emerald-500" />,
        description: "Estás nuevamente en línea.",
        duration: 3000,
        position: "top-center",
      });
      wasOffline.current = false;
    }
  }, [isOffline]);

  return null;
}
