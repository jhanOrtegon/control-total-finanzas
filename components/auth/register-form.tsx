"use client";

import React, { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

import { useGlobalLoading } from "@/providers/loading-provider";

interface RegisterFormProps {
  onLoginClick: () => void;
  onOtpRequired: (email: string) => void;
}

export function RegisterForm({ onLoginClick, onOtpRequired }: RegisterFormProps) {
  const { theme } = useTheme();
  const { withLoading } = useGlobalLoading();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    await withLoading(async () => {
      try {
        const { data, error } = await insforge.auth.signUp({
          email,
          password,
        });

        if (error) {
          toast.error(error.message || "Error al registrarse.");
          return;
        }

        onOtpRequired(email);
        toast.success("¡Registro exitoso! Te hemos enviado un código de verificación de 6 dígitos a tu correo.");
      } catch (err: any) {
        toast.error(err.message || "Error al registrarse.");
      }
    }, "Creando cuenta de usuario...");
  };

  const inputBase = `w-full rounded-2xl py-3.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 ${
    theme === "dark"
      ? "bg-white/[0.05] border border-white/[0.08] text-white placeholder-slate-500 focus:ring-indigo-500/40 focus:border-indigo-500/40"
      : "bg-slate-50/80 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-indigo-500/30 focus:border-indigo-400"
  }`;

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <label className={`block text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          Correo Electrónico
        </label>
        <div className="relative group">
          <span className={`absolute inset-y-0 left-0 pl-4 flex items-center transition-colors ${
            theme === "dark" ? "text-slate-500 group-focus-within:text-indigo-400" : "text-slate-400 group-focus-within:text-indigo-500"
          }`}>
            <Mail className="w-[18px] h-[18px]" />
          </span>
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={`${inputBase} pl-11 pr-4`}
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className={`block text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          Contraseña
        </label>
        <div className="relative group">
          <span className={`absolute inset-y-0 left-0 pl-4 flex items-center transition-colors ${
            theme === "dark" ? "text-slate-500 group-focus-within:text-indigo-400" : "text-slate-400 group-focus-within:text-indigo-500"
          }`}>
            <Lock className="w-[18px] h-[18px]" />
          </span>
          <input
            type="password"
            placeholder="Mín. 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className={`${inputBase} pl-11 pr-4`}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full font-bold py-3.5 px-4 rounded-2xl transition-all duration-200 shadow-lg cursor-pointer disabled:opacity-50 text-sm flex items-center justify-center gap-2 group bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/25 hover:shadow-indigo-500/30 hover:shadow-xl active:scale-[0.98]"
      >
        <span>{loading ? "Creando cuenta..." : "Crear Cuenta"}</span>
        {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
      </button>

      {/* Login link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onLoginClick}
          className={`text-xs font-semibold transition ${
            theme === "dark"
              ? "text-slate-500 hover:text-indigo-400"
              : "text-slate-500 hover:text-indigo-600"
          }`}
        >
          ¿Ya tienes cuenta?{" "}
          <span className="font-bold underline underline-offset-2">Inicia sesión</span>
        </button>
      </div>
    </form>
  );
}
