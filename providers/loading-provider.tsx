"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useTheme } from "./theme-provider";
import { Sparkles } from "lucide-react";

interface LoadingContextType {
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: async (fn) => fn(),
  isLoading: false,
});

export const useGlobalLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [activeRequests, setActiveRequests] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Procesando transacción...");
  const { theme } = useTheme();

  const startLoading = useCallback((message?: string) => {
    if (message) setLoadingMessage(message);
    setActiveRequests((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setActiveRequests((prev) => Math.max(0, prev - 1));
  }, []);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>, message?: string): Promise<T> => {
    startLoading(message);
    try {
      return await fn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const isLoading = activeRequests > 0;

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading, withLoading, isLoading }}>
      {children}
      
      {/* Fullscreen Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col items-center max-w-sm text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Spinning Indicator with Glowing Effect */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
            </div>

            {/* Loading text messages */}
            <div className="space-y-1.5">
              <p className="text-sm font-black text-white tracking-wide">
                {loadingMessage}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                InsForge Finanzas
              </p>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
