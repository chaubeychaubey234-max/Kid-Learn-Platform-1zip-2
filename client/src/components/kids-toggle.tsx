import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import React from "react";

interface KidsToggleProps extends React.ComponentProps<typeof Switch> {
  label?: string;
}

export function KidsToggle({ label, id, className, ...props }: KidsToggleProps) {
  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <Switch
        id={id}
        className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted"
        {...props}
      />
      {label && (
        <Label 
          htmlFor={id} 
          className="text-sm font-medium text-foreground cursor-pointer"
        >
          {label}
        </Label>
      )}
    </div>
  );
}
