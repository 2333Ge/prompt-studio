"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { promptRepository } from "@/lib/repositories/dexie-repositories";
import { usePrivacyStore, useUIStore } from "@/lib/stores";
import type { PromptWithRelations } from "@/types";

export function usePrompts() {
  const query = useUIStore((state) => state.query);
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const [prompts, setPrompts] = useState<PromptWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await promptRepository.query({
        ...query,
        includePrivate: privacyModeEnabled,
      });
      setPrompts(data);
    } finally {
      setLoading(false);
    }
  }, [query, privacyModeEnabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { prompts, loading, refresh };
}

export function usePrompt(id: string | null) {
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const [prompt, setPrompt] = useState<PromptWithRelations | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!id) {
      setPrompt(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const data = await promptRepository.getById(id, privacyModeEnabled);
      setPrompt(data);
      hasLoadedRef.current = true;
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [id, privacyModeEnabled]);

  useEffect(() => {
    hasLoadedRef.current = false;
    void refresh();
  }, [refresh]);

  return { prompt, loading, refresh };
}
