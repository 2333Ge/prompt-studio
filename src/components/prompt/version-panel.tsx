"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GitCompare, RotateCcw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconTipButton } from "@/components/ui/icon-tip-button";
import { promptRepository, schemaRepository, versionRepository } from "@/lib/repositories/dexie-repositories";
import { formatVersionDate } from "@/lib/utils";
import type { PromptVersion } from "@/types";

const MonacoDiffEditor = dynamic(() => import("@/components/prompt/monaco-diff-editor"), { ssr: false });

interface VersionPanelProps {
  promptId: string;
  currentContent: string;
  onRollback: (content: string) => void;
}

export function VersionPanel({ promptId, currentContent, onRollback }: VersionPanelProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [compareVersion, setCompareVersion] = useState<PromptVersion | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const refresh = async () => {
    const data = await versionRepository.getByPromptId(promptId);
    setVersions(data);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptId]);

  const handleRollback = async (version: PromptVersion) => {
    if (!confirm("确定回滚到该版本吗？当前未保存的修改将丢失。")) return;

    let schemaId: string | null = null;
    if (version.schemaSnapshot && version.schemaSnapshot !== "{}") {
      try {
        const fields = JSON.parse(version.schemaSnapshot) as Record<string, import("@/types").VariableFieldDefinition>;
        const prompt = await promptRepository.getById(promptId, true);
        if (prompt?.schema) {
          await schemaRepository.update(prompt.schema.id, { fields });
          schemaId = prompt.schema.id;
        } else {
          const schema = await schemaRepository.create({
            name: `${prompt?.title ?? "Prompt"} Schema`,
            fields,
          });
          schemaId = schema.id;
        }
      } catch {
        // ignore invalid schema snapshot
      }
    }

    await promptRepository.update(promptId, { content: version.content, schemaId });
    onRollback(version.content);
    await refresh();
  };

  const handleDelete = async (version: PromptVersion) => {
    if (!confirm("确定删除该版本记录吗？此操作不可恢复。")) return;
    await versionRepository.delete(version.id);
    if (compareVersion?.id === version.id) {
      setCompareVersion(null);
      setDiffOpen(false);
    }
    await refresh();
  };

  const handleCompare = (version: PromptVersion) => {
    setCompareVersion(version);
    setDiffOpen(true);
  };

  return (
    <div className="space-y-2">
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无版本历史。</p>
      ) : (
        versions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{version.note || "未命名版本"}</p>
              <p className="text-xs text-muted-foreground">{formatVersionDate(version.createdAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <IconTipButton
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                label="对比"
                onClick={() => handleCompare(version)}
              >
                <GitCompare className="h-3.5 w-3.5" />
              </IconTipButton>
              <IconTipButton
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                label="回滚"
                onClick={() => void handleRollback(version)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </IconTipButton>
              <IconTipButton
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                label="删除"
                onClick={() => void handleDelete(version)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconTipButton>
            </div>
          </div>
        ))
      )}

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">版本对比</DialogTitle>
          {compareVersion && (
            <div className="grid grid-cols-2 border-b">
              <div className="px-4 py-2.5 text-xs text-muted-foreground">当前</div>
              <div className="border-l px-4 py-2.5 pr-12 text-xs text-muted-foreground">
                {compareVersion.note && <span>{compareVersion.note} · </span>}
                {formatVersionDate(compareVersion.createdAt)}
              </div>
            </div>
          )}
          {compareVersion && (
            <div className="h-[65vh]">
              <MonacoDiffEditor original={compareVersion.content} modified={currentContent} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
