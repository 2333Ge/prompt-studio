"use client";

import { cn } from "@/lib/utils";

interface PanelResizerProps {
  onMouseDown: (event: React.MouseEvent) => void;
  isResizing?: boolean;
}

export function PanelResizer({ onMouseDown, isResizing }: PanelResizerProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="调整分栏宽度"
      onMouseDown={onMouseDown}
      className={cn(
        "group relative hidden w-0 shrink-0 lg:block",
        "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border before:transition-colors",
        "after:absolute after:inset-y-0 after:-left-1.5 after:w-3 after:cursor-col-resize",
        "hover:before:bg-primary/60",
        isResizing && "before:bg-primary",
      )}
    />
  );
}
