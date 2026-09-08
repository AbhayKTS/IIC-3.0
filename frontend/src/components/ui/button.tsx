import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap border text-sm font-medium uppercase tracking-[0.14em] ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 chamfer-sm font-label",
  {
    variants: {
      variant: {
        default: "border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[var(--box-shadow-neon)]",
        destructive: "border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground",
        outline: "border-border bg-transparent text-foreground hover:border-primary hover:text-primary hover:shadow-[var(--box-shadow-neon-sm)]",
        secondary: "border-violet bg-transparent text-violet hover:bg-violet hover:text-violet-foreground hover:shadow-[var(--box-shadow-neon-secondary)]",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 px-4 py-2 text-xs",
        lg: "h-12 px-8 py-2",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
