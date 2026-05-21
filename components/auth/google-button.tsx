"use client";

import React, { useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

export function GoogleButton() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await insforge.auth.signInWithOAuth({
        provider: "google",
        redirectTo: window.location.origin,
      });

      if (error) {
        toast.error(error.message || "Error al iniciar sesión con Google.");
        return;
      }

      if (data && data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className={`w-full border font-bold py-2 px-4 rounded-xl transition flex items-center justify-center gap-3 shadow-lg cursor-pointer disabled:opacity-50 text-sm ${
        theme === "dark"
          ? "bg-slate-950 hover:bg-slate-900 border-slate-800 text-white"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
      }`}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#EA4335"
          d="M12 5.04c1.7 0 3.23.58 4.43 1.73l3.32-3.32C17.75 1.58 15.1 1 12 1 7.37 1 3.42 3.66 1.48 7.55l3.85 2.99C6.27 7.21 8.91 5.04 12 5.04z"
        />
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.46h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.5z"
        />
        <path
          fill="#FBBC05"
          d="M5.33 14.54c-.24-.72-.37-1.49-.37-2.29s.13-1.57.37-2.29L1.48 6.96C.53 8.86 0 10.97 0 13.17s.53 4.31 1.48 6.21l3.85-2.99-1.48-1.85z"
        />
        <path
          fill="#34A853"
          d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.66 1.09-3.09 0-5.73-2.17-6.66-5.5L1.48 15.83C3.42 20.34 7.37 23 12 23z"
        />
      </svg>
      <span>{loading ? "Conectando..." : "Google"}</span>
    </button>
  );
}
