import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const toastVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-text-primary [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 transition-all shadow-sm",
  {
    variants: {
      variant: {
        brand: "bg-brand-light/40 border-brand/20 text-text-primary [&>svg]:text-brand",
        success: "bg-green-50/50 border-success/20 text-text-primary [&>svg]:text-success",
        danger: "bg-red-50/50 border-danger/20 text-text-primary [&>svg]:text-danger",
        warning: "bg-amber-50/50 border-amber-300/20 text-text-primary [&>svg]:text-amber-500",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, children, ...props }, ref) => {
    const Icon =
      variant === "success"
        ? CheckCircle2
        : variant === "danger"
        ? XCircle
        : variant === "warning"
        ? AlertTriangle
        : Info;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-5 w-5" />
        <div className="flex flex-col gap-1">
          {title && <h5 className="font-semibold text-sm leading-none tracking-tight">{title}</h5>}
          {description && <div className="text-xs text-text-muted">{description}</div>}
          {children}
        </div>
      </div>
    );
  }
);
Toast.displayName = "Toast";

export { Toast };
