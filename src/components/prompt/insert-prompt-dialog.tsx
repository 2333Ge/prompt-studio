"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { promptRepository } from "@/lib/repositories/dexie-repositories";
import { usePrivacyStore } from "@/lib/stores";
import type { PromptWithRelations } from "@/types";

interface InsertPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPromptId: string;
  onInsert: (content: string) => void;
}

export function InsertPromptDialog({
  open,
  onOpenChange,
  currentPromptId,
  onInsert,
}: InsertPromptDialogProps) {
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const [search, setSearch] = useState("");
  const [prompts, setPrompts] = useState<PromptWithRelations[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void promptRepository
      .query({ includePrivate: privacyModeEnabled, sortBy: "updatedAt", sortOrder: "desc" })
      .then((items) => setPrompts(items.filter((item) => item.id !== currentPromptId)));
    setSearch("");
    setSelectedId(null);
  }, [open, currentPromptId, privacyModeEnabled]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return prompts;
    return prompts.filter(
      (prompt) =>
        prompt.title.toLowerCase().includes(keyword) ||
        prompt.content.toLowerCase().includes(keyword) ||
        prompt.notes.toLowerCase().includes(keyword),
    );
  }, [prompts, search]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const handleInsert = () => {
    if (!selected?.content.trim()) return;
    const prefix = selected.content.startsWith("\n") ? "" : "\n\n";
    onInsert(`${prefix}${selected.content}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>插入 Prompt</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索 Prompt 标题或正文..."
        />
        <div className="max-h-72 space-y-1 overflow-auto rounded-lg border p-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">没有匹配的 Prompt</p>
          ) : (
            filtered.map((prompt) => (
              <Button
                key={prompt.id}
                variant={selected?.id === prompt.id ? "secondary" : "ghost"}
                className="h-auto w-full justify-start px-3 py-2"
                onClick={() => setSelectedId(prompt.id)}
              >
                <FileText className="mr-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="truncate font-medium">{prompt.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{prompt.content || "暂无内容"}</p>
                </div>
              </Button>
            ))
          )}
        </div>
        {selected && (
          <pre className="max-h-32 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {selected.content}
          </pre>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleInsert} disabled={!selected?.content.trim()}>
            追加到光标处
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
