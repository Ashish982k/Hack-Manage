"use client";

import * as React from "react";
import { CheckCircle2, Flag, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ToastState } from "../_lib/types";

export function ToneBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const map = {
    neutral: "bg-white/5 text-white/80 ring-white/10",
    success: "bg-emerald-500/12 text-emerald-300 ring-emerald-400/30",
    warning: "bg-amber-500/12 text-amber-300 ring-amber-400/30",
    danger: "bg-rose-500/12 text-rose-300 ring-rose-400/30",
  } as const;

  return (
    <Badge
      className={`ring-1 backdrop-blur-sm transition ${map[tone]} hover:scale-[1.01]`}
    >
      {children}
    </Badge>
  );
}

export function PageGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/28 via-pink-500/18 to-blue-500/18 blur-3xl" />
      <div className="absolute right-[-140px] top-[220px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-blue-500/16 via-purple-500/16 to-pink-500/16 blur-3xl" />
      <div className="absolute bottom-[-220px] left-[-160px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-pink-500/16 via-purple-500/16 to-blue-500/12 blur-3xl" />
    </div>
  );
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  if (!toast) return null;
  const ok = toast.kind === "success";
  return (
    <div className="fixed inset-x-0 top-5 z-50 mx-auto w-[min(92vw,560px)]">
      <Card className={ok ? "border-emerald-500/30" : "border-rose-500/30"}>
        <CardHeader className="pb-3">
          <CardTitle
            className={
              ok
                ? "inline-flex items-center gap-2 text-emerald-300"
                : "inline-flex items-center gap-2 text-rose-300"
            }
          >
            {ok ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Flag className="size-4" />
            )}
            {toast.title}
          </CardTitle>
        </CardHeader>
        {toast.message ? (
          <CardContent className="pt-0">
            <p className="text-sm text-white/75">{toast.message}</p>
          </CardContent>
        ) : null}
      </Card>

      <Button
        variant="ghost"
        className="mt-2 w-full"
        onClick={onClose}
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4" />
          Dismiss
        </span>
      </Button>
    </div>
  );
}
