"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, Send, Bot, User, Sparkles, Loader2, Maximize2, Minimize2, Minus, PanelRightClose, RotateCcw } from "lucide-react";
import { useFinance } from "@/providers/finance-provider";
import { useFinancePeriod } from "@/providers/finance-period-provider";
import { useTheme } from "@/providers/theme-provider";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AssistantState = "ready" | "degraded" | "offline";
type SizeMode = "compact" | "balanced" | "large";
const CHAT_TIMEOUT_MS = 45_000;

export function NovaChatbot() {
  const [showStatus, setShowStatus] = useState(false);
  // Add animation style for Nova icon pulse/glow
  // No longer needed: animation style is now in globals.css
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sizeMode, setSizeMode] = useState<SizeMode>(() => {
    if (typeof window === "undefined") return "balanced";
    const savedSize = localStorage.getItem("nova:size-mode");
    return savedSize === "compact" || savedSize === "balanced" || savedSize === "large"
      ? savedSize
      : "balanced";
  });
  const [assistantState, setAssistantState] = useState<AssistantState>("ready");
  const [activeModel, setActiveModel] = useState("auto");
  const [lastPrompt, setLastPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "¡Hola! Soy Nova ⚡, tu copiloto financiero. Analizo tu situación y te doy acciones concretas. ¿Qué quieres optimizar hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();
  const { getMonthlySummary } = useFinance();
  const { month, year } = useFinancePeriod();

  const summary = useMemo(() => getMonthlySummary(month, year), [getMonthlySummary, month, year]);

  // Extract financial context safely
  const financeContext = useMemo(() => {
    const income = summary.totalIncome;
    const actualNeeds = summary.recurrentCommitted + summary.monthlyDebtMinimums;
    const actualSavings = summary.savingsGoal;

    const needsPct = income > 0 ? (actualNeeds / income) * 100 : 0;
    const savingsPct = income > 0 ? (actualSavings / income) * 100 : 0;

    let alerts = "";
    if (needsPct > 65) alerts += "- Carga fija mensual demasiado alta. Riesgo de liquidez.\n";
    if (summary.realAvailableCash < 0) alerts += "- Flujo de caja disponible negativo. ¡Alerta roja!\n";
    if (savingsPct < 10) alerts += "- Tasa de ahorro muy baja. Se recomienda subirla al 20%.\n";

    return {
      income: income.toLocaleString("es-CO"),
      needsPct: needsPct.toFixed(1),
      savingsPct: savingsPct.toFixed(1),
      totalDebt: summary.totalOutstandingDebt.toLocaleString("es-CO"),
      availableCash: summary.realAvailableCash.toLocaleString("es-CO"),
      alerts
    };
  }, [summary]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    localStorage.setItem("nova:size-mode", sizeMode);
  }, [sizeMode]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const windowSizeClass = useMemo(() => {
    if (isExpanded) return "inset-4 md:inset-10 rounded-3xl";

    if (sizeMode === "compact") {
      return "bottom-5 right-5 w-80 md:w-90 h-125 rounded-3xl origin-bottom-right";
    }

    if (sizeMode === "large") {
      return "bottom-4 right-4 w-96 md:w-120 h-150 rounded-3xl origin-bottom-right";
    }

    return "bottom-6 right-6 w-87.5 md:w-100 h-137.5 rounded-3xl origin-bottom-right";
  }, [isExpanded, sizeMode]);

  const cycleSizeMode = () => {
    setIsExpanded(false);
    setSizeMode((prev) => {
      if (prev === "compact") return "balanced";
      if (prev === "balanced") return "large";
      return "compact";
    });
  };

  const handleSend = async (quickQuestion?: string) => {
    const messageToSend = (quickQuestion ?? input).trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = { role: "user", content: messageToSend };
    setLastPrompt(messageToSend);
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          context: financeContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (data.message) {
        setAssistantState("ready");
        setActiveModel(typeof data.model === "string" && data.model.length > 0 ? data.model : "auto");
        setMessages(prev => [...prev, data.message]);
      } else {
        throw new Error("No message received");
      }
    } catch (error: unknown) {
      console.error("Error communicating with Nova:", error);
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";
      const isRateLimit = errorMessage.includes("429") || errorMessage.includes("rate") || errorMessage.includes("demasiadas solicitudes");
      const isMissingKey = errorMessage.includes("openrouter_api_key") || errorMessage.includes("configurar");
      const isTimeout = error instanceof Error && error.name === "AbortError";

      setAssistantState(isMissingKey ? "offline" : isRateLimit || isTimeout ? "degraded" : "offline");

      setMessages(prev => [...prev, {
        role: "assistant",
        content: isTimeout
          ? "Estoy tardando más de lo normal ⏳. Intenta de nuevo en unos segundos o usa una pregunta sugerida para responder más rápido."
          : isRateLimit
            ? "Estoy con muchísimo tráfico ahora mismo 🚦. Espera unos segundos y vuelve a intentar; mientras tanto, puedo ayudarte con una sugerencia rápida de tu panel."
            : isMissingKey
              ? "Estoy sin conexión al modelo IA en local 🛠️. Configura OPENROUTER_API_KEY y vuelvo a operar al 100%."
            : "Oops, tuve un problema conectándome a mi motor de análisis 🧠. Intenta de nuevo en unos segundos."
      }]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (!lastPrompt || isLoading) return;
    void handleSend(lastPrompt);
  };

  const statusPill = useMemo(() => {
    if (assistantState === "ready") {
      return {
        label: "Online",
        classes: "bg-emerald-500",
      };
    }

    if (assistantState === "degraded") {
      return {
        label: "Intermitente",
        classes: "bg-amber-400",
      };
    }

    return {
      label: "Sin conexión",
      classes: "bg-rose-400",
    };
  }, [assistantState]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className={`fixed bottom-24 md:bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"}`}>
        <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[1.25rem] blur-md opacity-60 animate-pulse pointer-events-none" />
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          title="Abrir Nova"
          aria-label="Abrir asistente Nova"
          className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-black border border-white/10 text-white shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <div className="absolute inset-0 bg-white/10 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span
            className="flex items-center justify-center w-10 h-10 rounded-full nova-glow"
          >
            <Bot className="w-6 h-6" />
          </span>
        </button>
      </div>

      {/* Minimized Dock */}
      <div className={`fixed bottom-24 md:bottom-6 right-6 z-50 transition-all duration-300 ${isOpen && isMinimized ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-xl backdrop-blur-xl ${
          theme === "dark" ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-slate-300"
        }`}>
          <button
            onClick={() => setIsMinimized(false)}
            title="Restaurar Nova"
            aria-label="Restaurar asistente Nova"
            className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <Bot className="w-3.5 h-3.5" /> Nova
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
              setIsExpanded(false);
            }}
            title="Cerrar Nova"
            aria-label="Cerrar asistente Nova"
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 transition"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Window */}
      <div
        className={`fixed z-50 transition-all duration-500 ease-out flex flex-col overflow-hidden border ${
          theme === "dark" ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-200"
        } shadow-2xl backdrop-blur-xl ${
          isOpen && !isMinimized
            ? `${windowSizeClass} opacity-100 scale-100`
            : `${windowSizeClass} opacity-0 scale-50 pointer-events-none`
        }`}
      >
        {/* Header */}
        <div className={`relative z-10 flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${theme === "dark" ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border relative nova-glow ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
              <div className={`absolute top-0 right-0 w-2 h-2 rounded-full border-2 ${assistantState === "ready" ? "bg-emerald-400 border-slate-800" : assistantState === "degraded" ? "bg-amber-400 border-slate-800" : "bg-rose-400 border-slate-800"}`}></div>
              <Bot className={`w-4 h-4 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`} />
            </div>
            <div>
              <h3 className={`font-bold text-xs tracking-[0.16em] ${theme === "dark" ? "text-slate-100" : "text-slate-700"}`}>NOVA</h3>
              <button
                type="button"
                onClick={() => setShowStatus((v) => !v)}
                className="focus:outline-none"
                title="Ver estado de conexión"
                aria-label="Ver estado de conexión"
              >
                <p className={`text-[10px] font-medium flex items-center gap-1 px-2 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  <span className={`inline-flex h-1.5 w-1.5 rounded-full ${statusPill.classes}`}></span>
                  {statusPill.label}
                </p>
              </button>
              {showStatus && (
                <div className={`absolute left-0 mt-2 z-50 min-w-30 px-3 py-2 rounded-xl shadow-lg text-xs font-bold ${
                  assistantState === "ready"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : assistantState === "degraded"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  <span className="block mb-1">{statusPill.label}</span>
                  <span className="block">{isExpanded ? "Vista amplia" : sizeMode}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={cycleSizeMode}
              title="Cambiar tamaño"
              aria-label="Cambiar tamaño del asistente"
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition hidden md:block ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
            >
              {sizeMode === "compact" ? "S" : sizeMode === "balanced" ? "M" : "L"}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Reducir tamaño" : "Expandir tamaño"}
              aria-label={isExpanded ? "Reducir tamaño del chat" : "Expandir chat"}
              className={`p-1.5 rounded-full transition cursor-pointer hidden md:block ${theme === "dark" ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setIsMinimized(true); setIsExpanded(false); }}
              title="Minimizar"
              aria-label="Minimizar asistente"
              className={`p-1.5 rounded-full transition cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setIsOpen(false); setIsExpanded(false); setIsMinimized(false); }}
              title="Cerrar"
              aria-label="Cerrar asistente"
              className={`p-1.5 rounded-full transition cursor-pointer ${theme === "dark" ? "hover:bg-slate-800 text-slate-400 hover:text-rose-300" : "hover:bg-slate-200 text-slate-500 hover:text-rose-500"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? theme === "dark" ? "bg-slate-700 text-slate-100" : "bg-slate-200 text-slate-700"
                    : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-sm ${
                  msg.role === "user"
                    ? theme === "dark" ? "bg-slate-700 text-slate-100 rounded-tr-none" : "bg-slate-800 text-white rounded-tr-none"
                    : theme === "dark"
                      ? "bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800"
                      : "bg-white text-slate-700 rounded-tl-none border border-slate-200"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%] flex-row">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className={`px-5 py-4 rounded-2xl text-sm shadow-xs rounded-tl-none flex items-center gap-2 ${
                  theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
                }`}>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  <span className="text-slate-400 text-xs font-semibold animate-pulse">Nova está procesando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`relative z-10 p-4 border-t shrink-0 ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-[10px] font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              Modelo: {activeModel}
            </span>
            {assistantState !== "ready" && lastPrompt && (
              <button
                onClick={handleRetry}
                title="Reintentar último mensaje"
                aria-label="Reintentar último mensaje"
                disabled={isLoading}
                className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-1 border disabled:opacity-50 ${theme === "dark" ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
              >
                <RotateCcw className="w-3 h-3" /> Reintentar
              </button>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregúntale a Nova..."
              className={`w-full pl-4 pr-12 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-slate-400/40 transition-all text-sm font-medium ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
              }`}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              title="Enviar mensaje"
              aria-label="Enviar mensaje a Nova"
              className={`absolute right-2 p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                input.trim() && !isLoading
                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-black/20"
                  : "bg-transparent text-slate-400"
              }`}
            >
              <Send className={`w-4 h-4 ${input.trim() && !isLoading ? "ml-0.5" : ""}`} />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-slate-400" /> Nova · Financial Co-Pilot
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
