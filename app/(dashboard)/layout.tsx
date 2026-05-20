"use client";

import React, { Suspense, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/providers/auth-provider";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useTheme } from "@/providers/theme-provider";
import { FinanceProvider } from "@/providers/finance-provider";
import { FinancePeriodProvider } from "@/providers/finance-period-provider";
import { NovaChatbot } from "@/components/ui/nova-chatbot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <FinanceProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <FinancePeriodProvider>
      <div
        className={`min-h-screen flex font-sans transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-96 bg-linear-to-b from-indigo-500/2 to-transparent blur-3xl pointer-events-none z-0" />

        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Header />

          {/* Extra bottom padding on mobile to avoid overlap with bottom tab bar */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 space-y-8 overflow-y-auto pb-24 md:pb-8">
            {children}
          </main>

          <footer
            className={`border-t py-8 text-center text-slate-500 text-xs mt-12 relative z-10 mb-16 md:mb-0 ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-900"
                : "bg-white border-slate-200 shadow-inner"
            }`}
          >
            <p>
              © 2026 Panel de Libertad Financiera. Lucha contra tu
              endeudamiento y recupera el control.
            </p>
          </footer>
        </div>

        <NovaChatbot />
      </div>
        </FinancePeriodProvider>
      </Suspense>
    </FinanceProvider>
  );
}
