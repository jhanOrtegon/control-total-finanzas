"use client";

import React from "react";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300 ${
      theme === "dark" ? "bg-slate-950" : "bg-slate-50"
    }`}>
      {/* Clean subtle top-glow for dark/light mode */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-indigo-500/[0.03] to-transparent blur-3xl pointer-events-none"></div>

      <div className={`w-full max-w-md backdrop-blur-xl border rounded-3xl p-8 shadow-2xl relative z-10 transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-900/60 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}>
        {children}
      </div>
    </div>
  );
}
