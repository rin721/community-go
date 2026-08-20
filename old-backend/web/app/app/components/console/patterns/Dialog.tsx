import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/console/primitives/Button";
import { cn } from "~/lib/cn";
import { useDialogFocusReturn } from "./useDialogFocusReturn";

type DialogProps = {
  children?: ReactNode;
  className?: string;
  closeLabel: string;
  description?: ReactNode;
  footer?: ReactNode;
  open: boolean;
  title: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function Dialog({
  children,
  className,
  closeLabel,
  description,
  footer,
  open,
  title,
  onOpenChange,
}: DialogProps) {
  const focusReturn = useDialogFocusReturn();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="console-dialog-overlay" />
        <DialogPrimitive.Content
          className={cn("console-dialog-content", className)}
          onCloseAutoFocus={focusReturn.onCloseAutoFocus}
          onOpenAutoFocus={focusReturn.onOpenAutoFocus}
        >
          <div className="console-dialog-header">
            <DialogPrimitive.Title className="console-dialog-title">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="console-dialog-description">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {children ? <div className="console-dialog-body">{children}</div> : null}
          {footer ? <div className="console-dialog-footer">{footer}</div> : null}
          <DialogPrimitive.Close asChild>
            <Button
              appearance="ghost"
              aria-label={closeLabel}
              className="console-dialog-close console-icon-button"
              icon={<X size={17} />}
            >
              <span className="console-sr-only">{closeLabel}</span>
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
