"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

import { useGlobalLoading } from "@/providers/loading-provider";

interface OtpFormProps {
  email: string;
  onBackToRegister: () => void;
}

export function OtpForm({ email, onBackToRegister }: OtpFormProps) {
  const { theme } = useTheme();
  const { refreshSession } = useAuth();
  const { withLoading } = useGlobalLoading();
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      toast.error("Ingresa el código OTP de 6 dígitos.");
      return;
    }

    await withLoading(async () => {
      try {
        const { data, error } = await insforge.auth.verifyEmail({
          email,
          otp: otpCode,
        });

        if (error) {
          toast.error(error.message || "Código inválido o expirado.");
          return;
        }

        if (data && data.user) {
          await refreshSession();
          toast.success("¡Correo verificado con éxito! Bienvenido a bordo.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error de verificación.");
      }
    }, "Verificando código de seguridad...");
  };

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-5">
      <div>
        <label className={`block text-sm font-bold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
          Código de Verificación
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Sparkles className="w-5 h-5" />
          </span>
          <input
            type="text"
            maxLength={6}
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            disabled={loading}
            className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 text-center tracking-widest text-lg font-bold transition ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Ingresa el código de 6 dígitos enviado a tu correo {email}.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full font-bold py-3.5 px-4 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 text-sm ${
          theme === "dark"
            ? "bg-slate-100 hover:bg-slate-200 text-slate-950 shadow-slate-950/50"
            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
        }`}
      >
        {loading ? "Verificando..." : "Verificar Correo"}
      </button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToRegister}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition"
        >
          Volver al registro
        </button>
      </div>
    </form>
  );
}
