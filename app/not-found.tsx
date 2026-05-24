"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "@/providers/theme-provider";
import { HelpCircle, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center font-sans px-4 transition-colors duration-300 relative overflow-hidden ${
        theme === "dark"
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Background neon glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Card */}
      <div
        className={`relative z-10 w-full max-w-md p-8 sm:p-10 border rounded-3xl shadow-2xl text-center space-y-6 backdrop-blur-md transition-all duration-300 ${
          theme === "dark"
            ? "bg-slate-900/60 border-slate-800 shadow-slate-950/50"
            : "bg-white/80 border-slate-200 shadow-slate-200/50"
        }`}
      >
        {/* Glowing Icon Container */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center relative group">
          <HelpCircle className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300 animate-pulse" />
          <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur opacity-30 group-hover:opacity-60 transition duration-500" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-lg font-black tracking-tight">
            ¿Te has perdido en tus finanzas?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-sm mx-auto">
            La página que estás buscando no existe o ha sido movida como parte de nuestro plan de ahorro de espacio. ¡Volvamos al camino de tu libertad financiera!
          </p>
        </div>

        {/* Call to action */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              // Force a hard reload to clear stale Next.js RSC chunks
              window.location.href = "/";
            }}
            className={`w-full py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-md ${
              theme === "dark"
                ? "bg-slate-100 hover:bg-slate-200 text-slate-950 shadow-slate-950/50"
                : "bg-slate-900 hover:bg-slate-850 text-white shadow-slate-900/10"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
