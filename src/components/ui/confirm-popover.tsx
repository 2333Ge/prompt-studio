"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ConfirmPopoverProps {
  children: ReactNode;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  onConfirm: () => void | Promise<void>;
}

export function ConfirmPopover({
  children,
  message,
  confirmLabel = "删除",
  cancelLabel = "取消",
  confirmVariant = "destructive",
  side = "top",
  align = "end",
  onConfirm,
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" side={side} align={align}>
        <p className="text-sm leading-relaxed">{message}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={() => void handleConfirm()} disabled={pending}>
            {pending ? "处理中…" : confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
