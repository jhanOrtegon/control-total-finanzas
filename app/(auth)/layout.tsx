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
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500 ${
        theme === "dark" ? "bg-[#0a0a1a]" : "bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100"
      }`}
    >
      {/* Animated gradient orbs */}
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none animate-pulse"
        style={{
          background: theme === "dark"
            ? "radial-gradient(circle, #6366f1 0%, transparent 70%)"
            : "radial-gradient(circle, #818cf8 0%, transparent 70%)",
          animationDuration: "4s",
        }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none animate-pulse"
        style={{
          background: theme === "dark"
            ? "radial-gradient(circle, #8b5cf6 0%, transparent 70%)"
            : "radial-gradient(circle, #a78bfa 0%, transparent 70%)",
          animationDuration: "6s",
        }}
      />

      {/* Grid pattern overlay (light mode only) */}
      {theme !== "dark" && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Card */}
      <div
        className={`w-full max-w-[420px] h-[70vh] min-h-[520px] max-h-[680px] flex flex-col overflow-hidden rounded-[28px] p-7 sm:p-8 relative z-10 transition-all duration-500 ${
          theme === "dark"
            ? "bg-white/[0.04] border border-white/[0.08] shadow-[0_8px_60px_-12px_rgba(99,102,241,0.15)] backdrop-blur-2xl text-white"
            : "bg-white/80 border border-slate-200/60 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.08)] backdrop-blur-2xl text-slate-900"
        }`}
      >
        {/* Inner glow top */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px ${
            theme === "dark"
              ? "bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
              : "bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent"
          }`}
        />
        {children}
      </div>
    </div>
  );
}
