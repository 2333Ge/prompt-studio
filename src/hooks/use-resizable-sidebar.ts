"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "prompt-editor-sidebar-width";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const MIN_EDITOR_WIDTH = 360;

export function useResizableSidebar() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed)));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const clampWidth = useCallback((width: number) => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 1200;
    const maxFromContainer = Math.max(MIN_WIDTH, containerWidth - MIN_EDITOR_WIDTH);
    return Math.min(MAX_WIDTH, maxFromContainer, Math.max(MIN_WIDTH, width));
  }, []);

  const onResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      dragStateRef.current = { startX: event.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const delta = drag.startX - event.clientX;
      setSidebarWidth(clampWidth(drag.startWidth + delta));
    };

    const onMouseUp = () => {
      dragStateRef.current = null;
      setIsResizing(false);
      setSidebarWidth((width) => {
        try {
          localStorage.setItem(STORAGE_KEY, String(width));
        } catch {
          // ignore storage errors
        }
        return width;
      });
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [clampWidth, isResizing]);

  return { sidebarWidth, isResizing, containerRef, onResizeStart };
}
