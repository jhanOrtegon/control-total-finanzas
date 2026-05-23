"use client";

import React, { useState } from "react";
import { useFinance } from "@/providers/finance-provider";
import { Sparkles, ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function SmartExpenseInput() {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { addExpense } = useFinance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsProcessing(true);
    
    try {
      const response = await fetch("/api/parse-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Error procesando gasto");
      }

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      await addExpense({
        title: data.title,
        amount: data.amount,
        category: data.category,
        type: "one-time",
        status: "paid",
        due_date: null,
        target_month: null,
      });

      setText("");
      toast.success("¡Gasto registrado con éxito usando IA!");
    } catch (error) {
      toast.error("Hubo un problema al entender tu gasto. Inténtalo de nuevo.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full relative group">
      <div
        className={`absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 ${isFocused ? "opacity-60" : ""}`}
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl flex items-center p-2 transition-all duration-300"
      >
        <div className="pl-4 text-indigo-500 dark:text-indigo-400">
          <Sparkles className={`w-5 h-5 ${isProcessing ? "animate-pulse" : ""}`} />
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Escribe tu gasto: 'Gasté 20 dólares en gasolina'..."
          className="flex-1 bg-transparent border-none focus:ring-0 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!text.trim() || isProcessing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
