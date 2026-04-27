import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "premium-card inline-flex items-center rounded-full border border-[#f2dcc2] bg-[#fff7e3] px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-[#746860] backdrop-blur",
  {
    variants: {
      variant: {
        default: "",
        glow: "shadow-[0_0_0_1px_rgba(255,255,255,0.72),0_10px_30px_rgba(227,106,106,0.16)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
