"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, CopyPlus, Eye, History, Lock, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrompt } from "@/hooks/use-prompts";
import {
  categoryRepository,
  promptRepository,
  tagRepository,
  versionRepository,
} from "@/lib/repositories/dexie-repositories";
import { usePrivacyStore, useUIStore } from "@/lib/stores";
import { cn, copyToClipboard } from "@/lib/utils";
import { fillTemplate, parseVariables, createDefaultField } from "@/lib/variables/parser";
import { syncSchemaFromContent } from "@/lib/variables/sync-schema";
import type { Category, Tag, VariableFieldDefinition } from "@/types";
import { VariableFormPanel } from "@/components/prompt/variable-form-panel";
import { SchemaEditorPanel } from "@/components/prompt/schema-editor-panel";
import { VersionPanel } from "@/components/prompt/version-panel";
import { ResultPanel } from "@/components/prompt/result-panel";
import { TranslationPanel } from "@/components/prompt/translation-panel";
import { TagMultiSelect } from "@/components/prompt/tag-multi-select";
import { EditorInsertToolbar } from "@/components/prompt/editor-insert-toolbar";
import { InsertVariablePicker } from "@/components/prompt/insert-variable-picker";
import { InsertPromptDialog } from "@/components/prompt/insert-prompt-dialog";
import type { MonacoEditorHandle } from "@/components/prompt/monaco-editor";

const MonacoEditor = dynamic(() => import("@/components/prompt/monaco-editor"), { ssr: false });

export default function PromptEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { prompt, loading, refresh } = usePrompt(params.id);
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const editorPanelTab = useUIStore((state) => state.editorPanelTab);
  const setEditorPanelTab = useUIStore((state) => state.setEditorPanelTab);
  const variableValues = useUIStore((state) => state.variableValues);
  const setVariableValues = useUIStore((state) => state.setVariableValues);

  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [insertVariableOpen, setInsertVariableOpen] = useState(false);
  const [insertPromptOpen, setInsertPromptOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [draftFields, setDraftFields] = useState<Record<string, VariableFieldDefinition>>({});
  const initializedPromptId = useRef<string | null>(null);
  const loadedFieldsKey = useRef<string | null>(null);
  const editorHandleRef = useRef<MonacoEditorHandle | null>(null);

  useEffect(() => {
    void Promise.all([categoryRepository.getAll(), tagRepository.getAll()]).then(([cats, tagList]) => {
      setCategories(cats);
      setTags(tagList);
    });
  }, []);

  useEffect(() => {
    if (!prompt) return;

    // 仅在切换到不同 Prompt 时从数据库初始化草稿，避免 refresh 覆盖未保存输入
    if (initializedPromptId.current !== prompt.id) {
      setLocalTitle(prompt.title);
      setLocalContent(prompt.content);
      setLocalNotes(prompt.notes);
      setEditorKey((key) => key + 1);
      setVariableValues({});
      initializedPromptId.current = prompt.id;
      setSelectedTagIds(prompt.tags.map((tag) => tag.id));
      setNewTagNames([]);
      setRating(prompt.rating);
      setIsFavorite(prompt.isFavorite);
      setIsPrivate(prompt.isPrivate);
      setCategoryId(prompt.categoryId);
    }
  }, [prompt, setVariableValues]);

  useEffect(() => {
    if (!prompt) return;
    const fieldsKey = `${prompt.id}:${prompt.schema?.id ?? "none"}`;
    if (loadedFieldsKey.current !== fieldsKey) {
      setDraftFields(prompt.schema?.fields ?? {});
      loadedFieldsKey.current = fieldsKey;
    }
  }, [prompt]);

  const parsedVariables = useMemo(() => parseVariables(localContent), [localContent]);
  const variableKey = useMemo(() => parsedVariables.join("\0"), [parsedVariables]);

  useEffect(() => {
    if (parsedVariables.length === 0) return;
    setDraftFields((current) => {
      let changed = false;
      const next = { ...current };
      for (const name of parsedVariables) {
        if (!(name in next)) {
          next[name] = prompt?.schema?.fields[name] ?? createDefaultField(name);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [parsedVariables, prompt?.schema?.fields]);

  const filledContent = useMemo(
    () => fillTemplate(localContent, variableValues, draftFields),
    [localContent, variableValues, draftFields],
  );

  const updateDraftField = (name: string, patch: Partial<VariableFieldDefinition>) => {
    setDraftFields((current) => ({
      ...current,
      [name]: { ...(current[name] ?? createDefaultField(name)), ...patch },
    }));
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">加载中...</div>;
  }

  if (!prompt) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Prompt 不存在，或当前模式下不可见。</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/prompts")}>
          返回列表
        </Button>
      </div>
    );
  }

  const handleSavePrompt = async () => {
    const { schemaId } = await syncSchemaFromContent(localContent, localTitle, prompt.schema, draftFields);

    await promptRepository.update(prompt.id, {
      title: localTitle,
      content: localContent,
      notes: localNotes,
      categoryId,
      rating,
      isFavorite,
      isPrivate,
      schemaId: schemaId ?? prompt.schemaId,
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
    setSaveMessage("已保存");
    await refresh();
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleSaveVersion = async () => {
    const { schemaId, fields } = await syncSchemaFromContent(
      localContent,
      localTitle,
      prompt.schema,
      draftFields,
    );
    const version = await versionRepository.create({
      promptId: prompt.id,
      content: localContent,
      schemaSnapshot: JSON.stringify(fields),
      note: versionNote,
    });
    await promptRepository.update(prompt.id, {
      content: localContent,
      currentVersionId: version.id,
      schemaId: schemaId ?? prompt.schemaId,
    });
    setVersionDialogOpen(false);
    setVersionNote("");
    await refresh();
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    await promptRepository.touchLastUsed(prompt.id);
    setSaveMessage("已复制");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleDuplicate = async () => {
    const duplicate = await promptRepository.duplicate(prompt.id);
    router.push(`/prompts/${duplicate.id}`);
  };

  const handleInsertText = (text: string) => {
    editorHandleRef.current?.insertText(text);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0"
            title={isFavorite ? "取消收藏" : "收藏"}
            onClick={() => setIsFavorite((value) => !value)}
          >
            <Star
              className={cn("h-4 w-4", isFavorite && "fill-amber-400 text-amber-400")}
            />
          </Button>
          <Input
            value={localTitle}
            onChange={(event) => setLocalTitle(event.target.value)}
            className="h-8 max-w-sm border-0 bg-transparent px-1 font-medium shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleSavePrompt()}>
            <Save className="h-4 w-4" />
            保存
          </Button>
          <Button variant="secondary" onClick={() => setVersionDialogOpen(true)}>
            <History className="h-4 w-4" />
            保存版本
          </Button>
          <Button variant="outline" onClick={() => void handleCopy(localContent)}>
            <Copy className="h-4 w-4" />
            复制正文
          </Button>
          <Button variant="outline" onClick={() => void handleCopy(filledContent)}>
            <Copy className="h-4 w-4" />
            复制填充结果
          </Button>
          <Button variant="outline" onClick={() => void handleDuplicate()}>
            <CopyPlus className="h-4 w-4" />
            创建副本
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            预览
          </Button>
          {saveMessage && <span className="text-sm text-muted-foreground">{saveMessage}</span>}
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-0 flex-col border-r">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
            <Select
              value={categoryId ?? "none"}
              onValueChange={(value) => setCategoryId(value === "none" ? null : value)}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <TagMultiSelect
              tags={tags}
              selectedTagIds={selectedTagIds}
              onSelectedTagIdsChange={setSelectedTagIds}
              newTagNames={newTagNames}
              onNewTagNamesChange={setNewTagNames}
            />

            <Select value={String(rating)} onValueChange={(value) => setRating(Number(value))}>
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value === 0 ? "未评分" : `${value} 星`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {privacyModeEnabled && (
              <Button
                type="button"
                size="icon"
                variant={isPrivate ? "secondary" : "ghost"}
                className="h-8 w-8 shrink-0"
                title={isPrivate ? "已设为隐私" : "设为隐私"}
                onClick={() => setIsPrivate((value) => !value)}
              >
                <Lock className={cn("h-4 w-4", isPrivate && "text-primary")} />
              </Button>
            )}

            <Textarea
              id="notes"
              value={localNotes}
              onChange={(event) => setLocalNotes(event.target.value)}
              placeholder="备注..."
              rows={1}
              className="min-h-8 min-w-[160px] flex-1 resize-none py-1.5"
            />
          </div>

          <div className="relative min-h-0 flex-1">
            <MonacoEditor
              key={`${prompt.id}-${editorKey}`}
              defaultValue={localContent}
              onChange={setLocalContent}
              onReady={(handle) => {
                editorHandleRef.current = handle;
              }}
            />
            <EditorInsertToolbar
              onInsertVariable={() => setInsertVariableOpen(true)}
              onInsertPrompt={() => setInsertPromptOpen(true)}
            />
          </div>
        </div>

        <aside className="min-h-0 overflow-auto p-4">
          <Tabs value={editorPanelTab} onValueChange={(value) => setEditorPanelTab(value as typeof editorPanelTab)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="variables">变量</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="versions">版本</TabsTrigger>
              <TabsTrigger value="results">结果</TabsTrigger>
              <TabsTrigger value="translation">翻译</TabsTrigger>
            </TabsList>
            <TabsContent value="variables" className="mt-4">
              <VariableFormPanel
                prompt={prompt}
                variableKey={variableKey}
                fields={draftFields}
                onUpdateField={updateDraftField}
              />
            </TabsContent>
            <TabsContent value="schema" className="mt-4">
              <SchemaEditorPanel
                prompt={prompt}
                variableKey={variableKey}
                fields={draftFields}
                onFieldsChange={setDraftFields}
                onRefresh={refresh}
              />
            </TabsContent>
            <TabsContent value="versions" className="mt-4">
              <VersionPanel
                promptId={prompt.id}
                currentContent={localContent}
                onRollback={(content) => {
                  setLocalContent(content);
                  setEditorKey((key) => key + 1);
                  void refresh();
                }}
              />
            </TabsContent>
            <TabsContent value="results" className="mt-4">
              <ResultPanel promptId={prompt.id} />
            </TabsContent>
            <TabsContent value="translation" className="mt-4">
              <TranslationPanel content={filledContent || localContent} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存版本</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="version-note">版本备注</Label>
            <Textarea
              id="version-note"
              value={versionNote}
              onChange={(event) => setVersionNote(event.target.value)}
              placeholder="描述本次变更..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSaveVersion()}>保存版本</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InsertVariablePicker
        open={insertVariableOpen}
        onOpenChange={setInsertVariableOpen}
        prompt={prompt}
        onInsert={handleInsertText}
      />

      <InsertPromptDialog
        open={insertPromptOpen}
        onOpenChange={setInsertPromptOpen}
        currentPromptId={prompt.id}
        onInsert={handleInsertText}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>填充预览</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
            {filledContent}
          </pre>
          <DialogFooter>
            <Button onClick={() => void handleCopy(filledContent)}>复制</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
