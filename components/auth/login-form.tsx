"use client";

import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { insforge } from "@/lib/insforge";
import { toast } from "sonner";

import { useGlobalLoading } from "@/providers/loading-provider";

interface LoginFormProps {
  onRegisterClick: () => void;
  onOtpRequired: (email: string) => void;
}

export function LoginForm({ onRegisterClick, onOtpRequired }: LoginFormProps) {
  const { theme } = useTheme();
  const { refreshSession } = useAuth();
  const { withLoading } = useGlobalLoading();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    
    await withLoading(async () => {
      try {
        const { data, error } = await insforge.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes("verify") || error.message.toLowerCase().includes("confirmed")) {
            onOtpRequired(email);
            toast.info("Se requiere verificación. Por favor revisa tu correo.");
          } else {
            toast.error(error.message || "Credenciales inválidas.");
          }
          return;
        }

        if (data && data.user) {
          await refreshSession();
          toast.success("¡Bienvenido!");
        }
      } catch (err: any) {
        toast.error(err.message || "Error al iniciar sesión.");
      }
    }, "Autenticando credenciales...");
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-3">
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
        {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
      </button>

      <div className="text-center pt-0.5">
        <button
          type="button"
          onClick={onRegisterClick}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition"
        >
          ¿No tienes cuenta? Regístrate
        </button>
      </div>
    </form>
  );
}
