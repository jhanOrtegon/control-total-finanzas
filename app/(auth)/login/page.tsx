"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { LoginForm } from "@/components/auth/login-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { OtpForm } from "@/components/auth/otp-form";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [emailForOtp, setEmailForOtp] = useState<string | null>(null);

  const handleRegisterClick = () => {
    router.push("/register");
  };

  const handleOtpRequired = (email: string) => {
    setEmailForOtp(email);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header / Brand */}
      <div className="text-center pt-1">
        <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-500 dark:text-indigo-400 mb-3 border border-indigo-500/10">
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-[22px] sm:text-2xl font-extrabold tracking-tight leading-tight">
          <span className={theme === "dark" ? "text-white" : "text-slate-900"}>
            Control Total{" "}
          </span>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
            Finanzas
          </span>
        </h1>
        <p className="text-[11px] sm:text-xs mt-1.5 font-medium text-slate-500 dark:text-slate-400">
          Supera tus deudas y recupera tu tranquilidad financiera
        </p>
      </div>

      {/* Form area — centered */}
      <div className="flex-1 flex flex-col justify-center py-5 sm:py-6">
        {emailForOtp ? (
          <OtpForm
            email={emailForOtp}
            onBackToRegister={() => setEmailForOtp(null)}
          />
        ) : (
          <LoginForm
            onRegisterClick={handleRegisterClick}
            onOtpRequired={handleOtpRequired}
          />
        )}
      </div>

      {/* Social login — bottom */}
      {!emailForOtp && (
        <div className="mt-auto space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${theme === "dark" ? "border-white/[0.06]" : "border-slate-200/80"}`} />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className={`px-3 font-bold tracking-widest ${
                theme === "dark"
                  ? "bg-[#0a0a1a]/0 text-slate-500"
                  : "bg-white/80 text-slate-400"
              }`}>
                O continuar con
              </span>
            </div>
          </div>
          <SocialButtons />
        </div>
      )}
    </div>
  );
}
