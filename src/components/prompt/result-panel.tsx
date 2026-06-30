"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resultRepository } from "@/lib/repositories/dexie-repositories";
import { formatDate } from "@/lib/utils";
import type { PromptResult } from "@/types";

interface ResultPanelProps {
  promptId: string;
}

export function ResultPanel({ promptId }: ResultPanelProps) {
  const [results, setResults] = useState<PromptResult[]>([]);
  const [modelName, setModelName] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [filterModel, setFilterModel] = useState("all");

  const refresh = async () => {
    setResults(await resultRepository.getByPromptId(promptId));
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptId]);

  const modelOptions = useMemo(
    () => Array.from(new Set(results.map((item) => item.modelName))),
    [results],
  );

  const filtered = filterModel === "all" ? results : results.filter((item) => item.modelName === filterModel);

  const handleCreate = async () => {
    if (!modelName.trim() || !content.trim()) return;
    await resultRepository.create({
      promptId,
      modelName: modelName.trim(),
      content,
      note,
    });
    setModelName("");
    setContent("");
    setNote("");
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await resultRepository.delete(id);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-2">
            <Label>模型名称</Label>
            <Input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="如 GPT-4o, Claude 3.5" />
          </div>
          <div className="space-y-2">
            <Label>结果内容</Label>
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} />
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <Button onClick={() => void handleCreate()}>
            <Plus className="h-4 w-4" />
            保存结果
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>按模型筛选</Label>
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部模型</SelectItem>
            {modelOptions.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无保存的结果。</p>
      ) : (
        filtered.map((result) => (
          <Card key={result.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{result.modelName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(result.createdAt)}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => void handleDelete(result.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {result.note && <p className="text-sm text-muted-foreground">{result.note}</p>}
              <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">{result.content}</pre>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
