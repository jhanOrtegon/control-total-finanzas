"use client";

import React, { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  minDate?: string;
  className?: string;
}

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

const toParts = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};

const parseISODate = (value: string | null | undefined) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return { year: y, month: m, day: d };
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  minDate,
  className,
}: DatePickerProps) {
  const today = new Date();
  const parsedValue = parseISODate(value);
  const parsedMin = parseISODate(minDate);

  const initialDate = parsedValue
    ? new Date(parsedValue.year, parsedValue.month - 1, parsedValue.day)
    : today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1);

  const monthOptions = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const yearOptions = useMemo(() => {
    const base = parsedMin?.year ?? today.getFullYear() - 2;
    return Array.from({ length: 12 }, (_, i) => base + i);
  }, [parsedMin?.year, today]);

  const minIso = parsedMin
    ? `${parsedMin.year}-${String(parsedMin.month).padStart(2, "0")}-${String(parsedMin.day).padStart(2, "0")}`
    : null;

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const firstDay = (first.getDay() + 6) % 7;
    const totalDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{ iso: string; day: number; disabled: boolean } | null> = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);

    for (let day = 1; day <= totalDays; day++) {
      const iso = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const disabled = !!minIso && iso < minIso;
      cells.push({ iso, day, disabled });
    }

    return cells;
  }, [viewYear, viewMonth, minIso]);

  const formattedValue = parsedValue
    ? new Date(parsedValue.year, parsedValue.month - 1, parsedValue.day).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const selectedIso = parsedValue
    ? `${parsedValue.year}-${String(parsedValue.month).padStart(2, "0")}-${String(parsedValue.day).padStart(2, "0")}`
    : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Calendar className="mr-2 h-4 w-4" />
        {formattedValue || placeholder}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar fecha</DialogTitle>
            <DialogDescription>Elige una fecha desde el calendario.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(viewMonth)} onValueChange={(v) => setViewMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(viewYear)} onValueChange={(v) => setViewYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="text-muted-foreground font-semibold py-1">
                  {d}
                </div>
              ))}

              {calendarDays.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} className="h-9" />;

                const isSelected = selectedIso === cell.iso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={cell.disabled}
                    onClick={() => {
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                    className={`h-9 rounded-md text-sm font-semibold transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    } ${cell.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(null);
              }}
            >
              Limpiar
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
