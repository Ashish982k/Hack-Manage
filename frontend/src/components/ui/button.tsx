import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.02em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E36A6A]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "premium-card border border-[#f2dcc2] bg-[#fff7e3] text-[#4f453f] shadow-sm hover:bg-[#ffefdc]",
        primary:
          "border border-[#d65f5f] bg-[#E36A6A] text-[#fffaf5] shadow-[0_0_0_1px_rgba(255,255,255,0.32),0_12px_30px_rgba(227,106,106,0.25)] hover:bg-[#cf5d5d]",
        outline:
          "border border-[#f2dcc2] bg-[#fffbf1] text-[#4f453f] hover:bg-[#fff2d0]",
        ghost:
          "bg-transparent text-[#746860] hover:bg-[#ffefdc] hover:text-[#4f453f]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-10 px-4 text-xs",
        lg: "h-12 px-7 text-base tracking-[0.025em]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
