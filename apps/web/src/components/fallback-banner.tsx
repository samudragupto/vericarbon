import React from "react";
import { AlertTriangle } from "lucide-react";

export function FallbackBanner({ className = "" }: { className?: string }) {
  return (
    <div
      data-testid="fallback-banner"
      className={`flex items-center gap-2 rounded-lg border border-amber-800/60 bg-amber-950/40 px-4 py-2.5 text-xs font-medium text-amber-300 backdrop-blur-sm ${className}`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span>Cached demo data — live sync in progress</span>
    </div>
  );
}
