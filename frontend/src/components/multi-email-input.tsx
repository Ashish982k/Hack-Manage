"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { addEmailsToList } from "@/lib/email-list";
import { cn } from "@/lib/utils";



interface MultiEmailInputProps {
  label: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
}

export function MultiEmailInput({
  label,
  emails,
  onChange,
  placeholder = "Enter email and press Enter",
  helperText,
  className,
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addFromInput = (rawInput: string) => {
    const { emails: nextEmails, invalidEmails, duplicateEmails } = addEmailsToList(
      emails,
      rawInput,
    );

    if (nextEmails.length !== emails.length) {
      onChange(nextEmails);
    }

    if (invalidEmails.length > 0) {
      setError(`Invalid email: ${invalidEmails[0]}`);
      return;
    }

    if (duplicateEmails.length > 0) {
      setError(`Already added: ${duplicateEmails[0]}`);
      return;
    }

    setError(null);
  };

  const commitInput = () => {
    if (!inputValue.trim()) return;
    addFromInput(inputValue);
    setInputValue("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-semibold text-[#c8cad0]">{label}</label>

      <div className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:ring-2 focus-within:ring-purple-400/35">
        {emails.map((email) => (
          <Badge key={email} className="gap-1.5 pr-1.5 text-white/90">
            <span>{email}</span>
            <button
              type="button"
              onClick={() => onChange(emails.filter((item) => item !== email))}
              className="rounded-full p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label={`Remove ${email}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              e.preventDefault();
              commitInput();
            }
          }}
          onBlur={commitInput}
          placeholder={emails.length === 0 ? placeholder : "Add another email"}
          className="h-7 min-w-[220px] flex-1 bg-transparent text-sm text-[#e2e4e9] placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-white/50">{helperText}</p>
      ) : null}
    </div>
  );
}
