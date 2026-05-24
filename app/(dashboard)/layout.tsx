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
import { CommandPalette } from "@/components/shared/command-palette";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
        className={`h-[100dvh] flex font-sans transition-colors duration-300 overflow-hidden ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-96 bg-linear-to-b from-indigo-500/2 to-transparent blur-3xl pointer-events-none z-0" />

        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10 overflow-x-hidden">
          <Header />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 space-y-8 overflow-y-auto pb-24 md:pb-8 flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <footer
              className={`border-t pt-8 pb-4 text-center text-slate-500 text-xs mt-12 ${
                theme === "dark"
                  ? "border-slate-800/60"
                  : "border-slate-200"
              }`}
            >
              <p>
                © 2026 Panel de Libertad Financiera. Lucha contra tu
                endeudamiento y recupera el control.
              </p>
            </footer>
          </main>
        </div>

        <NovaChatbot />
        <CommandPalette />
      </div>
        </FinancePeriodProvider>
      </Suspense>
    </FinanceProvider>
  );
}
