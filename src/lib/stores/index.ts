"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPassword, verifyPassword } from "@/lib/privacy/password";
import { DEFAULT_TEXT_MODEL } from "@/lib/siliconflow/models";
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
  setVariableValues: (
    values: Record<string, unknown> | ((current: Record<string, unknown>) => Record<string, unknown>),
  ) => void;
  mergeVariableValues: (values: Record<string, unknown>) => void;
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
  setVariableValues: (valuesOrUpdater) =>
    set((state) => {
      const next =
        typeof valuesOrUpdater === "function" ? valuesOrUpdater(state.variableValues) : valuesOrUpdater;
      if (Object.is(next, state.variableValues)) return state;
      return { variableValues: next };
    }),
  mergeVariableValues: (values) =>
    set((state) => {
      const next = { ...state.variableValues, ...values };
      if (Object.keys(values).every((key) => Object.is(state.variableValues[key], next[key]))) {
        return state;
      }
      return { variableValues: next };
    }),
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
  passwordHash: string | null;
  passwordDialogOpen: boolean;
  registerSecretTap: () => void;
  resetSecretTap: () => void;
  closePasswordDialog: () => void;
  openPasswordDialog: () => void;
  initPassword: (password: string) => Promise<void>;
  verifyAndEnable: (password: string) => Promise<boolean>;
  disablePrivacyMode: () => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      privacyModeEnabled: false,
      secretTapCount: 0,
      passwordHash: null,
      passwordDialogOpen: false,
      registerSecretTap: () => {
        if (get().privacyModeEnabled) return;
        const next = get().secretTapCount + 1;
        if (next >= 10) {
          set({ secretTapCount: 0, passwordDialogOpen: true });
        } else {
          set({ secretTapCount: next });
        }
      },
      resetSecretTap: () => set({ secretTapCount: 0 }),
      closePasswordDialog: () => set({ passwordDialogOpen: false, secretTapCount: 0 }),
      openPasswordDialog: () => set({ passwordDialogOpen: true, secretTapCount: 0 }),
      initPassword: async (password) => {
        const hash = await hashPassword(password);
        set({ passwordHash: hash, privacyModeEnabled: true, passwordDialogOpen: false, secretTapCount: 0 });
      },
      verifyAndEnable: async (password) => {
        const { passwordHash } = get();
        if (!passwordHash) return false;
        const ok = await verifyPassword(password, passwordHash);
        if (ok) {
          set({ privacyModeEnabled: true, passwordDialogOpen: false, secretTapCount: 0 });
        }
        return ok;
      },
      disablePrivacyMode: () => set({ privacyModeEnabled: false }),
    }),
    {
      name: "prompt-studio-privacy",
      partialize: (state) => ({
        passwordHash: state.passwordHash,
      }),
    },
  ),
);

interface SettingsState {
  siliconflowApiKey: string;
  siliconflowTextModel: string;
  translationTargetLanguage: string;
  setSiliconflowApiKey: (key: string) => void;
  setSiliconflowTextModel: (model: string) => void;
  setTranslationTargetLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      siliconflowApiKey: "",
      siliconflowTextModel: DEFAULT_TEXT_MODEL,
      translationTargetLanguage: "zh-CN",
      setSiliconflowApiKey: (key) => set({ siliconflowApiKey: key }),
      setSiliconflowTextModel: (model) => set({ siliconflowTextModel: model }),
      setTranslationTargetLanguage: (lang) => set({ translationTargetLanguage: lang }),
    }),
    { name: "prompt-studio-settings" },
  ),
);
