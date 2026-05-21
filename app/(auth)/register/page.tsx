"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { RegisterForm } from "@/components/auth/register-form";
import { GoogleButton } from "@/components/auth/google-button";
import { OtpForm } from "@/components/auth/otp-form";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [emailForOtp, setEmailForOtp] = useState<string | null>(null);

  const handleLoginClick = () => {
    router.push("/login");
  };

  const handleOtpRequired = (email: string) => {
    setEmailForOtp(email);
  };

  return (
    <>
      <div className="text-center mb-4">
        <div className="inline-flex p-2 rounded-2xl bg-slate-500/5 text-indigo-500 dark:text-indigo-400 mb-1.5 border border-slate-500/10">
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          <span className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>Control Total </span>
          <span className="text-indigo-600 dark:text-indigo-400">Finanzas</span>
        </h1>
        <p className="text-xs mt-1 font-medium text-slate-500 dark:text-slate-400">
          Crea tu cuenta de control de presupuesto hoy
        </p>
      </div>

      {emailForOtp ? (
        <OtpForm
          email={emailForOtp}
          onBackToRegister={() => setEmailForOtp(null)}
        />
      ) : (
        <>
          <RegisterForm
            onLoginClick={handleLoginClick}
            onOtpRequired={handleOtpRequired}
          />

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 font-bold tracking-wider bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                O continuar con
              </span>
            </div>
          </div>

          <GoogleButton />
        </>
      )}
    </>
  );
}
