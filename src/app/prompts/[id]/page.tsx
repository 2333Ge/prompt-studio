"use client";

import dynamic from "next/dynamic";
import { useRef, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { Copy, CopyPlus, Eye, History, Lock, Save, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelResizer } from "@/components/ui/panel-resizer";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePromptEditor } from "@/hooks/use-prompt-editor";
import { useResizableSidebar } from "@/hooks/use-resizable-sidebar";
import { usePrivacyStore, useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { VariableFormPanel } from "@/components/prompt/variable-form-panel";
import { SchemaEditorPanel } from "@/components/prompt/schema-editor-panel";
import { VersionPanel } from "@/components/prompt/version-panel";
import { ResultPanel } from "@/components/prompt/result-panel";
import { TranslationPanel } from "@/components/prompt/translation-panel";
import { TagMultiSelect } from "@/components/prompt/tag-multi-select";
import { CategorySelect } from "@/components/prompt/category-select";
import { EditorInsertToolbar } from "@/components/prompt/editor-insert-toolbar";
import { InsertVariablePicker } from "@/components/prompt/insert-variable-picker";
import { InsertPromptDialog } from "@/components/prompt/insert-prompt-dialog";
import type { MonacoEditorHandle } from "@/components/prompt/monaco-editor";

const MonacoEditor = dynamic(() => import("@/components/prompt/monaco-editor"), { ssr: false });

export default function PromptEditorPage() {
  const params = useParams<{ id: string }>();
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const editorPanelTab = useUIStore((state) => state.editorPanelTab);
  const setEditorPanelTab = useUIStore((state) => state.setEditorPanelTab);

  const editor = usePromptEditor(params.id);
  const { sidebarWidth, isResizing, containerRef, onResizeStart } = useResizableSidebar();
  const editorHandleRef = useRef<MonacoEditorHandle | null>(null);

  if (editor.loading) {
    return <div className="p-6 text-sm text-muted-foreground">加载中...</div>;
  }

  if (!editor.prompt) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Prompt 不存在，或当前模式下不可见。</p>
        <Button className="mt-4" variant="outline" onClick={() => editor.router.push("/prompts")}>
          返回列表
        </Button>
      </div>
    );
  }

  const { prompt } = editor;

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
            title={editor.isFavorite ? "取消收藏" : "收藏"}
            onClick={editor.toggleFavorite}
          >
            <Star
              className={cn("h-4 w-4", editor.isFavorite && "fill-amber-400 text-amber-400")}
            />
          </Button>
          <Input
            value={editor.title}
            onChange={(event) => editor.setTitle(event.target.value)}
            className="h-8 max-w-sm border-0 bg-transparent px-1 font-medium shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void editor.handleSavePrompt()}>
            <Save className="h-4 w-4" />
            保存
          </Button>
          <Button variant="secondary" onClick={() => editor.setVersionDialogOpen(true)}>
            <History className="h-4 w-4" />
            保存版本
          </Button>
          <Button variant="outline" onClick={() => void editor.handleCopy(editor.content)}>
            <Copy className="h-4 w-4" />
            复制正文
          </Button>
          <Button variant="outline" onClick={() => void editor.handleCopy(editor.filledContent)}>
            <Copy className="h-4 w-4" />
            复制填充结果
          </Button>
          <Button variant="outline" onClick={editor.handleDuplicateWithGuard}>
            <CopyPlus className="h-4 w-4" />
            创建副本
          </Button>
          <Button variant="outline" onClick={() => editor.setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            预览
          </Button>
          {editor.saveMessage && (
            <span className="text-sm text-muted-foreground">{editor.saveMessage}</span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row",
          isResizing && "select-none",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
            <CategorySelect
              categories={editor.categories}
              categoryId={editor.categoryId}
              onCategoryIdChange={editor.setCategoryId}
              newCategoryName={editor.newCategoryName}
              onNewCategoryNameChange={editor.setNewCategoryName}
            />

            <TagMultiSelect
              tags={editor.tags}
              selectedTagIds={editor.selectedTagIds}
              onSelectedTagIdsChange={editor.setSelectedTagIds}
              newTagNames={editor.newTagNames}
              onNewTagNamesChange={editor.setNewTagNames}
            />

            <Select
              value={String(editor.rating)}
              onValueChange={(value) => editor.setRating(Number(value))}
            >
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
                variant={editor.isPrivate ? "secondary" : "ghost"}
                className="h-8 w-8 shrink-0"
                title={editor.isPrivate ? "已设为隐私" : "设为隐私"}
                onClick={editor.togglePrivate}
              >
                <Lock className={cn("h-4 w-4", editor.isPrivate && "text-primary")} />
              </Button>
            )}

            <Textarea
              id="notes"
              value={editor.notes}
              onChange={(event) => editor.setNotes(event.target.value)}
              placeholder="备注..."
              rows={1}
              className="min-h-8 min-w-[160px] flex-1 resize-none py-1.5"
            />
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="absolute inset-0">
              <MonacoEditor
                key={`${prompt.id}-${editor.editorKey}`}
                defaultValue={editor.content}
                onChange={editor.setContent}
                onReady={(handle) => {
                  editorHandleRef.current = handle;
                }}
              />
            </div>
            <EditorInsertToolbar
              onInsertVariable={() => editor.setInsertVariableOpen(true)}
              onInsertPrompt={() => editor.setInsertPromptOpen(true)}
            />
          </div>
        </div>

        <PanelResizer onMouseDown={onResizeStart} isResizing={isResizing} />

        <aside
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t p-4 lg:flex-none lg:w-[var(--sidebar-width)] lg:shrink-0 lg:border-t-0"
          style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        >
          <Tabs
            value={editorPanelTab}
            onValueChange={(value) => setEditorPanelTab(value as typeof editorPanelTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="grid w-full shrink-0 grid-cols-5">
              <TabsTrigger value="variables">变量</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="versions">版本</TabsTrigger>
              <TabsTrigger value="results">结果</TabsTrigger>
              <TabsTrigger value="translation">翻译</TabsTrigger>
            </TabsList>
            <TabsContent
              value="variables"
              forceMount
              className="mt-4 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
            >
              <VariableFormPanel
                prompt={prompt}
                variableKey={editor.variableKey}
                fields={editor.draftFields}
              />
            </TabsContent>
            <TabsContent
              value="schema"
              forceMount
              className="mt-4 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
            >
              <SchemaEditorPanel
                variableKey={editor.variableKey}
                fields={editor.draftFields}
                onFieldsChange={editor.setDraftFields}
                onFieldSaved={editor.handleGlobalFieldSaved}
              />
            </TabsContent>
            <TabsContent
              value="versions"
              forceMount
              className="mt-4 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
            >
              <VersionPanel
                promptId={prompt.id}
                currentContent={editor.content}
                onRollback={editor.handleRollback}
              />
            </TabsContent>
            <TabsContent
              value="results"
              forceMount
              className="mt-4 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
            >
              <ResultPanel promptId={prompt.id} />
            </TabsContent>
            <TabsContent
              value="translation"
              forceMount
              className="mt-4 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
            >
              <TranslationPanel content={editor.filledContent || editor.content} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <Dialog open={editor.versionDialogOpen} onOpenChange={editor.setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存版本</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="version-note">版本备注</Label>
            <Textarea
              id="version-note"
              value={editor.versionNote}
              onChange={(event) => editor.setVersionNote(event.target.value)}
              placeholder="描述本次变更..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => editor.setVersionDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void editor.handleSaveVersion()}>保存版本</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InsertVariablePicker
        open={editor.insertVariableOpen}
        onOpenChange={editor.setInsertVariableOpen}
        onInsert={(key, definition) => editor.handleInsertVariable(key, definition, handleInsertText)}
      />

      <InsertPromptDialog
        open={editor.insertPromptOpen}
        onOpenChange={editor.setInsertPromptOpen}
        currentPromptId={prompt.id}
        onInsert={handleInsertText}
      />

      <Dialog
        open={editor.unsavedChanges.leaveDialogOpen}
        onOpenChange={(open) => !open && editor.unsavedChanges.cancelLeave()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>有未保存的更改</DialogTitle>
            <DialogDescription>离开此页面将丢失未保存的内容，确定要离开吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={editor.unsavedChanges.cancelLeave}>
              继续编辑
            </Button>
            <Button variant="destructive" onClick={editor.unsavedChanges.confirmLeave}>
              离开不保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editor.previewOpen} onOpenChange={editor.setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>填充预览</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
            {editor.filledContent}
          </pre>
          <DialogFooter>
            <Button onClick={() => void editor.handleCopy(editor.filledContent)}>复制</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
