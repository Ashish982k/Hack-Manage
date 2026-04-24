import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
        <input
          type={type}
          className={cn(
            "premium-card flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium tracking-[0.01em] text-[#e2e4e9] placeholder:text-white/40 backdrop-blur-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e14] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
