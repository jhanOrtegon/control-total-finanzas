"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value?: number;
  onChange?: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      // Update display value if external value changes
      if (value !== undefined && value !== null && !isNaN(value)) {
        setDisplayValue(new Intl.NumberFormat("es-CO").format(value));
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "");
      const numValue = rawValue ? parseInt(rawValue, 10) : 0;
      
      // Update local display immediately
      setDisplayValue(new Intl.NumberFormat("es-CO").format(numValue));
      
      if (onChange) {
        onChange(numValue);
      }
    };

    return (
      <div className="relative flex items-center w-full">
        <span className="absolute left-3 text-slate-500 font-medium pointer-events-none">$</span>
        <Input
          type="text"
          inputMode="numeric"
          className={cn("!pl-8", className)}
          value={displayValue}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
