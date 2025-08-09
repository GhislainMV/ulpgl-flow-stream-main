import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16",
    xl: "h-20 w-20"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl", 
    xl: "text-2xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img 
        src="/lovable-uploads/a2faa002-4127-46ac-a6c6-a4b737c88537.png"
        alt="ULPGL Logo"
        className={cn(sizeClasses[size], "object-contain")}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={cn("font-bold text-primary", textSizeClasses[size])}>
            ULPGL
          </span>
          <span className={cn("text-muted-foreground text-xs leading-tight")}>
            Université Libre du Pays des Grands Lacs
          </span>
        </div>
      )}
    </div>
  );
}