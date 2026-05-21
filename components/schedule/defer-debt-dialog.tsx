"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, HelpCircle } from "lucide-react";

interface DeferDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtTitle: string;
  onConfirm: (observation: string) => Promise<boolean>;
}

export function DeferDebtDialog({
  open,
  onOpenChange,
  debtTitle,
  onConfirm,
}: DeferDebtDialogProps) {
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = observation.trim();
    if (!trimmed) {
      setError("La observación es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      const success = await onConfirm(trimmed);
      if (success) {
        setObservation("");
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al aplazar la deuda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        setError("");
        setObservation("");
        onOpenChange(val);
      }
    }}>
      <DialogContent showCloseButton={!loading} className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <HelpCircle className="w-5 h-5" />
              </div>
              <DialogTitle>Aplazar cuota de deuda</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Vas a aplazar la cuota de este mes para la deuda: <strong className="text-slate-900 dark:text-slate-100">{debtTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/[0.06] border border-amber-500/10 rounded-2xl text-xs text-amber-600 dark:text-amber-400 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              ¿Qué sucederá con esta deuda?
            </p>
            <p className="leading-relaxed">
              Esta cuota se excluirá de las obligaciones del mes seleccionado y la fecha final de pago se desplazará automáticamente 1 mes al final.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Razón del aplazamiento <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Ej: Gastos imprevistos de salud este mes"
              value={observation}
              onChange={(e) => {
                setObservation(e.target.value);
                if (e.target.value.trim()) setError("");
              }}
              disabled={loading}
              className={error ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
            />
            {error && (
              <p className="text-xs font-medium text-rose-500">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !observation.trim()}
              className="bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 text-white"
            >
              {loading ? "Aplazando..." : "Confirmar Aplazamiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
