"use client";

import React from "react";
import { useTheme } from "@/providers/theme-provider";

export function LoadingSpinner() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
      theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-r-4 border-l-4 border-purple-500 animate-spin-reverse"></div>
      </div>
      <p className="mt-6 text-indigo-500 font-bold animate-pulse">Analizando tu situación financiera...</p>
    </div>
  );
}
