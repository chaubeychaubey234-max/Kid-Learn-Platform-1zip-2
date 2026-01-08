import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";

interface KidsButtonProps extends React.ComponentProps<typeof Button> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
}

export function KidsButton({ variant = "primary", className, ...props }: KidsButtonProps) {
  const variantStyles = {
    primary: "bg-primary text-primary-foreground shadow-sm active-elevate-2 hover-elevate",
    secondary: "bg-secondary text-secondary-foreground shadow-sm active-elevate-2 hover-elevate",
    outline: "border-2 border-primary text-primary bg-transparent hover:bg-primary/5 active-elevate-2 hover-elevate",
    ghost: "text-primary bg-transparent hover:bg-primary/5 no-default-active-elevate",
  };

  return (
    <Button
      className={cn(
        "rounded-2xl font-bold transition-all duration-300",
        variantStyles[variant as keyof typeof variantStyles],
        className
      )}
      {...props}
    />
  );
}
