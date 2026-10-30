"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, description }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, description };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => toast({ type: "success", title, description }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ type: "error", title, description }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) => toast({ type: "info", title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200",
              t.type === "success" && "border-emerald-800 bg-zinc-950/95 text-emerald-300",
              t.type === "error" && "border-red-800 bg-zinc-950/95 text-red-300",
              t.type === "info" && "border-zinc-800 bg-zinc-950/95 text-zinc-200"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm">
              <div className="font-semibold text-zinc-100">{t.title}</div>
              {t.description && <div className="mt-1 text-xs text-zinc-400 break-words">{t.description}</div>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

