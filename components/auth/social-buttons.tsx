"use client";

import React, { useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

const PROVIDERS = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 5.04c1.7 0 3.23.58 4.43 1.73l3.32-3.32C17.75 1.58 15.1 1 12 1 7.37 1 3.42 3.66 1.48 7.55l3.85 2.99C6.27 7.21 8.91 5.04 12 5.04z" />
        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.46h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.5z" />
        <path fill="#FBBC05" d="M5.33 14.54c-.24-.72-.37-1.49-.37-2.29s.13-1.57.37-2.29L1.48 6.96C.53 8.86 0 10.97 0 13.17s.53 4.31 1.48 6.21l3.85-2.99-1.48-1.85z" />
        <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.66 1.09-3.09 0-5.73-2.17-6.66-5.5L1.48 15.83C3.42 20.34 7.37 23 12 23z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.33-.86 3.91-.86 1.65.06 2.92.68 3.73 1.62-3.15 1.76-2.58 5.76.28 6.78-.63 1.76-1.52 3.42-3.01 4.63zm-4.73-13.8c-.28-2.04 1.64-3.9 3.78-4.14.39 2.14-1.76 4.14-3.78 4.14z" />
      </svg>
    ),
  },
] as const;

export function SocialButtons() {
  const { theme } = useTheme();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: string) => {
    try {
      setLoadingProvider(provider);
      const { data, error } = await insforge.auth.signInWithOAuth({
        provider,
        redirectTo: window.location.origin,
      });

      if (error) {
        toast.error(error.message || `Error al iniciar sesión con ${provider}.`);
        return;
      }

      if (data && data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || `Error al conectar con ${provider}.`);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {PROVIDERS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleOAuthSignIn(id)}
          disabled={loadingProvider !== null}
          title={`Continuar con ${label}`}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-xs transition-all duration-200 cursor-pointer disabled:opacity-40 group ${
            theme === "dark"
              ? "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] text-slate-300"
              : "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-sm hover:shadow"
          }`}
        >
          <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${loadingProvider === id ? "animate-spin" : ""}`}>
            {loadingProvider === id ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              icon
            )}
          </span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
