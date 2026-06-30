"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GitCompare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { promptRepository, schemaRepository, versionRepository } from "@/lib/repositories/dexie-repositories";
import { formatDate } from "@/lib/utils";
import type { PromptVersion } from "@/types";

const MonacoDiffEditor = dynamic(() => import("@/components/prompt/monaco-diff-editor"), { ssr: false });

interface VersionPanelProps {
  promptId: string;
  onRollback: (content: string) => void;
}

export function VersionPanel({ promptId, onRollback }: VersionPanelProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [diffOpen, setDiffOpen] = useState(false);

  const refresh = async () => {
    const data = await versionRepository.getByPromptId(promptId);
    setVersions(data);
    if (data.length >= 2) {
      setLeftId(data[1].id);
      setRightId(data[0].id);
    } else if (data.length === 1) {
      setLeftId(data[0].id);
      setRightId(data[0].id);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptId]);

  const leftVersion = versions.find((item) => item.id === leftId);
  const rightVersion = versions.find((item) => item.id === rightId);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={leftId} onValueChange={setLeftId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="旧版本" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                {formatDate(version.createdAt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rightId} onValueChange={setRightId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="新版本" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                {formatDate(version.createdAt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={!leftVersion || !rightVersion} onClick={() => setDiffOpen(true)}>
          <GitCompare className="h-4 w-4" />
          对比
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无版本历史。</p>
      ) : (
        versions.map((version) => (
          <Card key={version.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{formatDate(version.createdAt)}</p>
                {version.note && <p className="mt-1 text-sm text-muted-foreground">{version.note}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => void handleRollback(version)}>
                <RotateCcw className="h-4 w-4" />
                回滚
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>版本对比</DialogTitle>
          </DialogHeader>
          {leftVersion && rightVersion && (
            <div className="h-[60vh]">
              <MonacoDiffEditor original={leftVersion.content} modified={rightVersion.content} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
