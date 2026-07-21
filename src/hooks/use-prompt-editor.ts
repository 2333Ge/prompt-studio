"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  categoryRepository,
  promptRepository,
  tagRepository,
  versionRepository,
} from "@/lib/repositories/dexie-repositories";
import { usePromptEditorStore } from "@/lib/stores/prompt-editor-store";
import { useUIStore } from "@/lib/stores";
import { copyToClipboard } from "@/lib/utils";
import { fillTemplate, parseVariables, buildVariablePlaceholder } from "@/lib/variables/parser";
import { resolveFieldsForKeys } from "@/lib/variables/global-field-registry";
import type { Category, Tag, VariableFieldDefinition } from "@/types";
import { usePrompt } from "./use-prompts";
import { useUnsavedChanges } from "./use-unsaved-changes";

function flashMessage(setSaveMessage: (msg: string) => void, message: string) {
  setSaveMessage(message);
  setTimeout(() => setSaveMessage(""), 2000);
}

export function usePromptEditor(promptId: string) {
  const router = useRouter();
  const { prompt, loading, refresh } = usePrompt(promptId);

  const variableValues = useUIStore((state) => state.variableValues);
  const setVariableValues = useUIStore((state) => state.setVariableValues);
  const mergeVariableValues = useUIStore((state) => state.mergeVariableValues);

  const editor = usePromptEditorStore();
  const {
    title,
    content,
    notes,
    categoryId,
    newCategoryName,
    selectedTagIds,
    newTagNames,
    rating,
    isFavorite,
    isPrivate,
    draftFields,
    baselineFields,
    editorKey,
    versionDialogOpen,
    versionNote,
    previewOpen,
    insertVariableOpen,
    insertPromptOpen,
    saveMessage,
    initializeFromPrompt,
    setTitle,
    setContent,
    setNotes,
    setCategoryId,
    setNewCategoryName,
    setSelectedTagIds,
    setNewTagNames,
    setRating,
    toggleFavorite,
    togglePrivate,
    setDraftFields,
    setBaselineFields,
    bumpEditorKey,
    setVersionDialogOpen,
    setVersionNote,
    setPreviewOpen,
    setInsertVariableOpen,
    setInsertPromptOpen,
    setSaveMessage,
    reset,
  } = editor;

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const loadedFieldsKey = useRef<string | null>(null);
  const prevParsedVariablesRef = useRef<string[]>([]);
  const initializedPromptId = useRef<string | null>(null);

  useEffect(() => {
    void Promise.all([categoryRepository.getAll(), tagRepository.getAll()]).then(([cats, tagList]) => {
      setCategories(cats);
      setTags(tagList);
    });
  }, []);

  useEffect(() => {
    if (!prompt) return;

    if (initializedPromptId.current !== prompt.id) {
      initializeFromPrompt(prompt);
      setVariableValues(prompt.variableValues ?? {});
      prevParsedVariablesRef.current = [];
      loadedFieldsKey.current = null;
      initializedPromptId.current = prompt.id;
    }
  }, [prompt, initializeFromPrompt, setVariableValues]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  useEffect(() => {
    if (!prompt) return;
    if (loadedFieldsKey.current === prompt.id) return;

    const keys = parseVariables(prompt.content);
    void resolveFieldsForKeys(keys).then((fields) => {
      setBaselineFields(fields);
      setDraftFields(fields);
      loadedFieldsKey.current = prompt.id;
    });
  }, [prompt, setBaselineFields, setDraftFields]);

  const parsedVariables = useMemo(() => parseVariables(content), [content]);
  const variableKey = useMemo(() => parsedVariables.join("\0"), [parsedVariables]);

  useEffect(() => {
    if (parsedVariables.length === 0) return;

    let cancelled = false;
    void (async () => {
      const resolved = await resolveFieldsForKeys(parsedVariables);
      if (cancelled) return;
      setDraftFields((current) => {
        const next = { ...current };
        let changed = false;
        for (const name of parsedVariables) {
          if (!(name in next)) {
            next[name] = resolved[name];
            changed = true;
          }
        }
        return changed ? next : current;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [parsedVariables, setDraftFields]);

  useEffect(() => {
    const prevSet = new Set(prevParsedVariablesRef.current);
    const newlyAdded = parsedVariables.filter((name) => !prevSet.has(name));
    prevParsedVariablesRef.current = parsedVariables;

    if (newlyAdded.length === 0) return;

    void (async () => {
      const resolved = await resolveFieldsForKeys(newlyAdded);
      const defaults: Record<string, unknown> = {};
      for (const name of newlyAdded) {
        defaults[name] = resolved[name]?.default ?? draftFields[name]?.default ?? "";
      }
      mergeVariableValues(defaults);
    })();
  }, [draftFields, mergeVariableValues, parsedVariables]);

  const filledContent = useMemo(
    () => fillTemplate(content, variableValues, draftFields),
    [content, variableValues, draftFields],
  );

  const isDirty = useMemo(() => {
    if (!prompt) return false;

    const savedTagIds = prompt.tags
      .map((tag) => tag.id)
      .sort()
      .join(",");
    const currentTagIds = [...selectedTagIds].sort().join(",");

    if (title !== prompt.title) return true;
    if (content !== prompt.content) return true;
    if (notes !== prompt.notes) return true;
    if (categoryId !== prompt.categoryId) return true;
    if (newCategoryName) return true;
    if (rating !== prompt.rating) return true;
    if (isFavorite !== prompt.isFavorite) return true;
    if (isPrivate !== prompt.isPrivate) return true;
    if (currentTagIds !== savedTagIds) return true;
    if (newTagNames.length > 0) return true;
    if (JSON.stringify(draftFields) !== JSON.stringify(baselineFields)) return true;
    if (JSON.stringify(variableValues) !== JSON.stringify(prompt.variableValues ?? {})) return true;

    return false;
  }, [
    prompt,
    title,
    content,
    notes,
    categoryId,
    newCategoryName,
    rating,
    isFavorite,
    isPrivate,
    selectedTagIds,
    newTagNames,
    draftFields,
    baselineFields,
    variableValues,
  ]);

  const unsavedChanges = useUnsavedChanges(isDirty);

  const handleSavePrompt = useCallback(async () => {
    if (!prompt) return;

    let finalCategoryId = categoryId;
    if (newCategoryName) {
      const category = await categoryRepository.findOrCreate(newCategoryName);
      finalCategoryId = category.id;
      setCategories(await categoryRepository.getAll());
      setNewCategoryName(null);
      setCategoryId(category.id);
    }

    await promptRepository.update(prompt.id, {
      title,
      content,
      notes,
      categoryId: finalCategoryId,
      rating,
      isFavorite,
      isPrivate,
      variableValues,
    });

    const existingTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
    const allTags = await tagRepository.findOrCreate([
      ...existingTags.map((tag) => tag.name),
      ...newTagNames,
    ]);
    await promptRepository.setTags(
      prompt.id,
      allTags.map((tag) => tag.id),
    );
    setNewTagNames([]);
    flashMessage(setSaveMessage, "已保存");
    await refresh();
  }, [
    prompt,
    categoryId,
    newCategoryName,
    title,
    content,
    notes,
    rating,
    isFavorite,
    isPrivate,
    variableValues,
    tags,
    selectedTagIds,
    newTagNames,
    setNewCategoryName,
    setCategoryId,
    setNewTagNames,
    setSaveMessage,
    refresh,
  ]);

  const handleSaveVersion = useCallback(async () => {
    if (!prompt) return;

    const version = await versionRepository.create({
      promptId: prompt.id,
      content,
      schemaSnapshot: JSON.stringify(draftFields),
      note: versionNote,
    });
    await promptRepository.update(prompt.id, {
      content,
      currentVersionId: version.id,
    });
    setVersionDialogOpen(false);
    setVersionNote("");
    await refresh();
  }, [prompt, content, draftFields, versionNote, setVersionDialogOpen, setVersionNote, refresh]);

  const handleCopy = useCallback(
    async (text: string) => {
      if (!prompt) return;
      await copyToClipboard(text);
      await promptRepository.touchLastUsed(prompt.id);
      flashMessage(setSaveMessage, "已复制");
    },
    [prompt, setSaveMessage],
  );

  const handleDuplicate = useCallback(async () => {
    if (!prompt) return;
    const duplicate = await promptRepository.duplicate(prompt.id);
    router.push(`/prompts/${duplicate.id}`);
  }, [prompt, router]);

  const handleDuplicateWithGuard = useCallback(() => {
    unsavedChanges.guardAction(() => void handleDuplicate());
  }, [unsavedChanges, handleDuplicate]);

  const handleInsertVariable = useCallback(
    (key: string, definition: VariableFieldDefinition, insertText: (text: string) => void) => {
      insertText(buildVariablePlaceholder(key));
      setDraftFields((current) => ({
        ...current,
        [key]: definition,
      }));
      mergeVariableValues({ [key]: definition.default ?? "" });
    },
    [setDraftFields, mergeVariableValues],
  );

  const handleGlobalFieldSaved = useCallback(
    (fieldName: string, definition: VariableFieldDefinition) => {
      setBaselineFields((current) => ({ ...current, [fieldName]: definition }));
      flashMessage(setSaveMessage, "全局变量已保存");
    },
    [setBaselineFields, setSaveMessage],
  );

  const handleRollback = useCallback(
    (rolledBackContent: string) => {
      setContent(rolledBackContent);
      bumpEditorKey();
      void refresh();
    },
    [setContent, bumpEditorKey, refresh],
  );

  return {
    prompt,
    loading,
    categories,
    tags,
    filledContent,
    variableKey,
    unsavedChanges,
    title,
    content,
    notes,
    categoryId,
    newCategoryName,
    selectedTagIds,
    newTagNames,
    rating,
    isFavorite,
    isPrivate,
    draftFields,
    editorKey,
    versionDialogOpen,
    versionNote,
    previewOpen,
    insertVariableOpen,
    insertPromptOpen,
    saveMessage,
    setTitle,
    setContent,
    setNotes,
    setCategoryId,
    setNewCategoryName,
    setSelectedTagIds,
    setNewTagNames,
    setRating,
    toggleFavorite,
    togglePrivate,
    setDraftFields,
    setVersionDialogOpen,
    setVersionNote,
    setPreviewOpen,
    setInsertVariableOpen,
    setInsertPromptOpen,
    handleSavePrompt,
    handleSaveVersion,
    handleCopy,
    handleDuplicateWithGuard,
    handleInsertVariable,
    handleGlobalFieldSaved,
    handleRollback,
    router,
  };
}
