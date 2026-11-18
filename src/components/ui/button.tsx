import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Oltin tugma, toʻq koʻk matn (kontrast ~6:1)
        primary:
          "bg-gradient-to-b from-brand-300 to-brand-500 text-navy-950 shadow-gold hover:from-brand-200 hover:to-brand-400 hover:shadow-lg",
        navy: "bg-navy-800 text-white hover:bg-navy-900 shadow-soft",
        outline: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
        ghost: "text-navy-800 hover:bg-navy-50",
        light: "bg-white text-navy-900 hover:bg-navy-50 shadow-soft",
        // Toʻq fonda ikkinchi darajali tugma
        glass: "border border-white/25 bg-white/5 text-white backdrop-blur hover:border-white/40 hover:bg-white/10",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
