"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-ocean-600 to-ocean-500 text-white shadow-lg shadow-ocean-600/25 hover:shadow-xl hover:shadow-ocean-500/30 hover:brightness-110 btn-glow",
        secondary:
          "bg-white dark:bg-deep-800 text-deep-800 dark:text-deep-200 border border-deep-200 dark:border-deep-700 shadow-sm hover:bg-deep-50 dark:hover:bg-deep-700 hover:border-ocean-300 dark:hover:border-ocean-600",
        coral:
          "bg-gradient-to-r from-sunset-500 to-coral-500 text-white shadow-lg shadow-coral-500/25 hover:shadow-xl hover:shadow-coral-500/30 hover:brightness-110",
        ghost:
          "text-deep-600 dark:text-deep-300 hover:bg-deep-100 dark:hover:bg-deep-800",
        outline:
          "border-2 border-white/25 text-white hover:bg-white/10 hover:border-white/40",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-13 px-8 text-lg",
        xl: "h-15 px-10 text-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
