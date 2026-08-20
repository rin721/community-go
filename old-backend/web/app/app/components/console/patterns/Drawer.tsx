import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/console/primitives/Button";
import { cn } from "~/lib/cn";
import { useDialogFocusReturn } from "./useDialogFocusReturn";

type DrawerSide = "bottom" | "left" | "right" | "top";

type DrawerProps = {
  children: ReactNode;
  className?: string;
  closeLabel: string;
  description?: ReactNode;
  footer?: ReactNode;
  open: boolean;
  side?: DrawerSide;
  title: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function Drawer({
  children,
  className,
  closeLabel,
  description,
  footer,
  open,
  side = "right",
  title,
  onOpenChange,
}: DrawerProps) {
  const focusReturn = useDialogFocusReturn();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="console-dialog-overlay" />
        <DialogPrimitive.Content
          className={cn("console-drawer-content", `console-drawer-content--${side}`, className)}
          onCloseAutoFocus={focusReturn.onCloseAutoFocus}
          onOpenAutoFocus={focusReturn.onOpenAutoFocus}
        >
          <header className="console-drawer-header">
            <div>
              <DialogPrimitive.Title className="console-drawer-title">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="console-drawer-description">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                appearance="ghost"
                aria-label={closeLabel}
                className="console-icon-button"
                icon={<X size={17} />}
              >
                <span className="console-sr-only">{closeLabel}</span>
              </Button>
            </DialogPrimitive.Close>
          </header>
          <div className="console-drawer-body">{children}</div>
          {footer ? <footer className="console-drawer-footer">{footer}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
