"use client";

import { create } from "zustand";
import type { PromptWithRelations, VariableFieldDefinition } from "@/types";

interface PromptEditorState {
  promptId: string | null;
  title: string;
  content: string;
  notes: string;
  categoryId: string | null;
  newCategoryName: string | null;
  selectedTagIds: string[];
  newTagNames: string[];
  rating: number;
  isFavorite: boolean;
  isPrivate: boolean;
  draftFields: Record<string, VariableFieldDefinition>;
  baselineFields: Record<string, VariableFieldDefinition>;
  editorKey: number;
  versionDialogOpen: boolean;
  versionNote: string;
  previewOpen: boolean;
  insertVariableOpen: boolean;
  insertPromptOpen: boolean;
  saveMessage: string;
  initializeFromPrompt: (prompt: PromptWithRelations) => void;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setNotes: (notes: string) => void;
  setCategoryId: (id: string | null) => void;
  setNewCategoryName: (name: string | null) => void;
  setSelectedTagIds: (ids: string[]) => void;
  setNewTagNames: (names: string[]) => void;
  setRating: (rating: number) => void;
  toggleFavorite: () => void;
  togglePrivate: () => void;
  setDraftFields: (
    fields:
      | Record<string, VariableFieldDefinition>
      | ((
          current: Record<string, VariableFieldDefinition>,
        ) => Record<string, VariableFieldDefinition>),
  ) => void;
  setBaselineFields: (
    fields:
      | Record<string, VariableFieldDefinition>
      | ((
          current: Record<string, VariableFieldDefinition>,
        ) => Record<string, VariableFieldDefinition>),
  ) => void;
  bumpEditorKey: () => void;
  setVersionDialogOpen: (open: boolean) => void;
  setVersionNote: (note: string) => void;
  setPreviewOpen: (open: boolean) => void;
  setInsertVariableOpen: (open: boolean) => void;
  setInsertPromptOpen: (open: boolean) => void;
  setSaveMessage: (message: string) => void;
  reset: () => void;
}

const initialState = {
  promptId: null as string | null,
  title: "",
  content: "",
  notes: "",
  categoryId: null as string | null,
  newCategoryName: null as string | null,
  selectedTagIds: [] as string[],
  newTagNames: [] as string[],
  rating: 0,
  isFavorite: false,
  isPrivate: false,
  draftFields: {} as Record<string, VariableFieldDefinition>,
  baselineFields: {} as Record<string, VariableFieldDefinition>,
  editorKey: 0,
  versionDialogOpen: false,
  versionNote: "",
  previewOpen: false,
  insertVariableOpen: false,
  insertPromptOpen: false,
  saveMessage: "",
};

export const usePromptEditorStore = create<PromptEditorState>((set, get) => ({
  ...initialState,
  initializeFromPrompt: (prompt) => {
    if (get().promptId === prompt.id) return;
    set({
      promptId: prompt.id,
      title: prompt.title,
      content: prompt.content,
      notes: prompt.notes,
      editorKey: get().editorKey + 1,
      selectedTagIds: prompt.tags.map((tag) => tag.id),
      newTagNames: [],
      rating: prompt.rating,
      isFavorite: prompt.isFavorite,
      isPrivate: prompt.isPrivate,
      categoryId: prompt.categoryId,
      newCategoryName: null,
      draftFields: {},
      baselineFields: {},
    });
  },
  setTitle: (title) => set({ title }),
  setContent: (content) => set({ content }),
  setNotes: (notes) => set({ notes }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setNewCategoryName: (newCategoryName) => set({ newCategoryName }),
  setSelectedTagIds: (selectedTagIds) => set({ selectedTagIds }),
  setNewTagNames: (newTagNames) => set({ newTagNames }),
  setRating: (rating) => set({ rating }),
  toggleFavorite: () => set((state) => ({ isFavorite: !state.isFavorite })),
  togglePrivate: () => set((state) => ({ isPrivate: !state.isPrivate })),
  setDraftFields: (fieldsOrUpdater) =>
    set((state) => ({
      draftFields:
        typeof fieldsOrUpdater === "function" ? fieldsOrUpdater(state.draftFields) : fieldsOrUpdater,
    })),
  setBaselineFields: (fieldsOrUpdater) =>
    set((state) => ({
      baselineFields:
        typeof fieldsOrUpdater === "function"
          ? fieldsOrUpdater(state.baselineFields)
          : fieldsOrUpdater,
    })),
  bumpEditorKey: () => set((state) => ({ editorKey: state.editorKey + 1 })),
  setVersionDialogOpen: (versionDialogOpen) => set({ versionDialogOpen }),
  setVersionNote: (versionNote) => set({ versionNote }),
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  setInsertVariableOpen: (insertVariableOpen) => set({ insertVariableOpen }),
  setInsertPromptOpen: (insertPromptOpen) => set({ insertPromptOpen }),
  setSaveMessage: (saveMessage) => set({ saveMessage }),
  reset: () => set(initialState),
}));
