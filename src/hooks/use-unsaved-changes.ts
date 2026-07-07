"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (href === window.location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      pendingActionRef.current = () => router.push(href);
      setLeaveDialogOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, router]);

  const guardAction = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setLeaveDialogOpen(true);
    },
    [isDirty],
  );

  const confirmLeave = useCallback(() => {
    setLeaveDialogOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const cancelLeave = useCallback(() => {
    setLeaveDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

  return {
    leaveDialogOpen,
    confirmLeave,
    cancelLeave,
    guardAction,
  };
}
