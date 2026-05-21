"use client";

import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";
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

  return (
    <form onSubmit={handleSignUp} className="space-y-3">
      <div>
        <label className={`block text-xs font-bold mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
          Correo Electrónico
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Mail className="w-4 h-4" />
          </span>
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={`w-full border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition text-sm ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />
        </div>
      </div>

      <div>
        <label className={`block text-xs font-bold mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
          Contraseña
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Lock className="w-4 h-4" />
          </span>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className={`w-full border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition text-sm ${
              theme === "dark"
                ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full font-bold py-2 px-4 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 text-sm ${
          theme === "dark"
            ? "bg-slate-100 hover:bg-slate-200 text-slate-950 shadow-slate-950/50"
            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
        }`}
      >
        {loading ? "Creando cuenta..." : "Crear Cuenta"}
      </button>

      <div className="text-center pt-0.5">
        <button
          type="button"
          onClick={onLoginClick}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition"
        >
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </div>
    </form>
  );
}
