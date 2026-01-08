import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React from "react";

interface KidsCardProps extends React.ComponentProps<typeof Card> {
  title?: string;
  description?: string;
}

export function KidsCard({ title, description, className, children, ...props }: KidsCardProps) {
  return (
    <Card 
      className={cn(
        "kids-card-hover border-2 border-muted bg-card text-card-foreground",
        className
      )} 
      {...props}
    >
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-xl font-bold">{title}</CardTitle>}
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
