"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PromptQueryOptions, PromptWithRelations } from "@/types";

interface UIState {
  currentPromptId: string | null;
  editorPanelTab: "variables" | "versions" | "results" | "schema" | "translation";
  draftContent: string;
  draftTitle: string;
  draftNotes: string;
  variableValues: Record<string, unknown>;
  query: PromptQueryOptions;
  setCurrentPromptId: (id: string | null) => void;
  setEditorPanelTab: (tab: UIState["editorPanelTab"]) => void;
  setDraftContent: (content: string) => void;
  setDraftTitle: (title: string) => void;
  setDraftNotes: (notes: string) => void;
  setVariableValues: (values: Record<string, unknown>) => void;
  setQuery: (query: Partial<PromptQueryOptions>) => void;
  resetDraft: (prompt?: PromptWithRelations | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPromptId: null,
  editorPanelTab: "variables",
  draftContent: "",
  draftTitle: "",
  draftNotes: "",
  variableValues: {},
  query: {
    sortBy: "updatedAt",
    sortOrder: "desc",
  },
  setCurrentPromptId: (id) => set({ currentPromptId: id }),
  setEditorPanelTab: (tab) => set({ editorPanelTab: tab }),
  setDraftContent: (content) => set({ draftContent: content }),
  setDraftTitle: (title) => set({ draftTitle: title }),
  setDraftNotes: (notes) => set({ draftNotes: notes }),
  setVariableValues: (values) => set({ variableValues: values }),
  setQuery: (query) => set((state) => ({ query: { ...state.query, ...query } })),
  resetDraft: (prompt) =>
    set({
      draftContent: prompt?.content ?? "",
      draftTitle: prompt?.title ?? "",
      draftNotes: prompt?.notes ?? "",
      variableValues: {},
    }),
}));

interface PrivacyState {
  privacyModeEnabled: boolean;
  secretTapCount: number;
  showPrivacyToggle: boolean;
  togglePrivacyMode: () => void;
  registerSecretTap: () => void;
  resetSecretTap: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      privacyModeEnabled: false,
      secretTapCount: 0,
      showPrivacyToggle: false,
      togglePrivacyMode: () => set((state) => ({ privacyModeEnabled: !state.privacyModeEnabled })),
      registerSecretTap: () => {
        const next = get().secretTapCount + 1;
        set({
          secretTapCount: next,
          showPrivacyToggle: next >= 10 ? true : get().showPrivacyToggle,
        });
      },
      resetSecretTap: () => set({ secretTapCount: 0 }),
    }),
    {
      name: "prompt-studio-privacy",
      partialize: (state) => ({ privacyModeEnabled: state.privacyModeEnabled, showPrivacyToggle: state.showPrivacyToggle }),
    },
  ),
);

interface SettingsState {
  translationProvider: "deepl" | "google" | "iframe";
  translationApiKey: string;
  translationTargetLanguage: string;
  translationIframeUrl: string;
  setTranslationProvider: (provider: SettingsState["translationProvider"]) => void;
  setTranslationApiKey: (key: string) => void;
  setTranslationTargetLanguage: (lang: string) => void;
  setTranslationIframeUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      translationProvider: "iframe",
      translationApiKey: "",
      translationTargetLanguage: "EN",
      translationIframeUrl: "https://translate.google.com/",
      setTranslationProvider: (provider) => set({ translationProvider: provider }),
      setTranslationApiKey: (key) => set({ translationApiKey: key }),
      setTranslationTargetLanguage: (lang) => set({ translationTargetLanguage: lang }),
      setTranslationIframeUrl: (url) => set({ translationIframeUrl: url }),
    }),
    { name: "prompt-studio-settings" },
  ),
);
