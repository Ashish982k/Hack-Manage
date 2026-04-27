import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
        <input
          type={type}
          className={cn(
            "premium-card flex h-11 w-full rounded-xl border border-[#f2dcc2] bg-[#fff7e3] px-4 py-2 text-sm font-medium tracking-[0.01em] text-[#4f453f] placeholder:text-[#9b8d82] backdrop-blur-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E36A6A]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF1] disabled:cursor-not-allowed disabled:opacity-50",
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
