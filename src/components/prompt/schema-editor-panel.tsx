"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { promptRepository, schemaRepository } from "@/lib/repositories/dexie-repositories";
import { inferVariableMorph } from "@/lib/variables/parser";
import { FIELD_TYPE_OPTIONS, FLAG_VALUE_TYPE_OPTIONS } from "@/lib/variables/schema-builder";
import type { FlagValueType, PromptWithRelations, VariableFieldDefinition } from "@/types";

interface SchemaEditorPanelProps {
  prompt: PromptWithRelations;
  variableKey: string;
  content: string;
  onRefresh: () => Promise<void>;
}

export function SchemaEditorPanel({ prompt, variableKey, content, onRefresh }: SchemaEditorPanelProps) {
  const [fields, setFields] = useState<Record<string, VariableFieldDefinition>>({});
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);
  const loadedSchemaId = useRef<string | null>(null);

  useEffect(() => {
    if (prompt.schema) {
      if (loadedSchemaId.current !== prompt.schema.id) {
        setFields(prompt.schema.fields);
        loadedSchemaId.current = prompt.schema.id;
      }
    } else {
      loadedSchemaId.current = null;
    }
  }, [prompt.schema?.id, prompt.schema]);

  const variableNames = variableKey ? variableKey.split("\0") : [];

  useEffect(() => {
    if (variableNames.length === 0) return;

    setFields((current) => {
      const next = { ...current };
      let changed = false;
      for (const name of variableNames) {
        if (!(name in next)) {
          const morph = inferVariableMorph(content, name);
          next[name] =
            prompt.schema?.fields[name] ??
            (morph === "flag"
              ? { type: "flag", title: name, required: false, valueType: "text", flag: `--${name}` }
              : { type: "text", title: name, required: false });
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [variableKey, prompt.schema, variableNames, content]);

  const persistSchema = async (saveAsCopy = false) => {
    if (saveAsCopy && prompt.schema) {
      const cloned = await schemaRepository.clone(prompt.schema.id, `${prompt.schema.name} (副本)`);
      const updated = await schemaRepository.update(cloned.id, { fields });
      await promptRepository.update(prompt.id, { schemaId: updated.id });
    } else if (prompt.schema) {
      await schemaRepository.update(prompt.schema.id, { fields });
    } else {
      const schema = await schemaRepository.create({
        name: `${prompt.title} Schema`,
        fields,
      });
      await promptRepository.update(prompt.id, { schemaId: schema.id });
    }
    await onRefresh();
    if (prompt.schema) {
      loadedSchemaId.current = prompt.schema.id;
    }
  };

  const handleCreateOrUpdate = async () => {
    if (prompt.schema) {
      const count = await promptRepository.countBySchemaId(prompt.schema.id);
      if (count > 1 || prompt.schema.isTemplate) {
        setLinkedCount(count);
        setOverwriteDialogOpen(true);
        return;
      }
    }
    await persistSchema(false);
  };

  const updateField = (name: string, patch: Partial<VariableFieldDefinition>) => {
    setFields((current) => ({
      ...current,
      [name]: { ...current[name], ...patch },
    }));
  };

  if (variableNames.length === 0) {
    return <p className="text-sm text-muted-foreground">当前 Prompt 没有变量。</p>;
  }

  return (
    <div className="space-y-4">
      {variableNames.map((name) => {
        const field = fields[name] ?? { type: "text", title: name };
        const isFlag = field.type === "flag";
        return (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-sm">{name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input
                  value={field.title ?? name}
                  onChange={(event) => updateField(name, { title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) => {
                    const type = value as VariableFieldDefinition["type"];
                    if (type === "flag") {
                      updateField(name, {
                        type,
                        valueType: "text",
                        flag: `--${name}`,
                      });
                    } else {
                      updateField(name, { type });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isFlag && (
                <>
                  <div className="space-y-2">
                    <Label>参数前缀</Label>
                    <Input
                      value={field.flag ?? `--${name}`}
                      onChange={(event) => updateField(name, { flag: event.target.value })}
                      placeholder="--ar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>值类型</Label>
                    <Select
                      value={field.valueType ?? "text"}
                      onValueChange={(value) => updateField(name, { valueType: value as FlagValueType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FLAG_VALUE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <Label>默认值相同时省略</Label>
                    <Switch
                      checked={Boolean(field.omitIfDefault)}
                      onCheckedChange={(checked) => updateField(name, { omitIfDefault: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <Label>保留在正文原位</Label>
                    <Switch
                      checked={Boolean(field.inlineFlag)}
                      onCheckedChange={(checked) => updateField(name, { inlineFlag: checked })}
                    />
                  </div>
                </>
              )}

              {(field.type === "select" || (isFlag && field.valueType === "select")) && (
                <div className="space-y-2">
                  <Label>选项（逗号分隔）</Label>
                  <Input
                    value={(field.options ?? []).join(", ")}
                    onChange={(event) =>
                      updateField(name, {
                        options: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              )}

              {isFlag && field.valueType === "number" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>最小值</Label>
                    <Input
                      type="number"
                      value={field.min ?? ""}
                      onChange={(event) =>
                        updateField(name, {
                          min: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>最大值</Label>
                    <Input
                      type="number"
                      value={field.max ?? ""}
                      onChange={(event) =>
                        updateField(name, {
                          max: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>默认值</Label>
                <Input
                  value={String(field.default ?? "")}
                  onChange={(event) => updateField(name, { default: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={field.description ?? ""}
                  onChange={(event) => updateField(name, { description: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>提示说明</Label>
                <Input
                  value={field.hint ?? ""}
                  onChange={(event) => updateField(name, { hint: event.target.value })}
                  placeholder="如：推荐 300，范围 0-1000"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label>必填</Label>
                <Switch
                  checked={Boolean(field.required)}
                  onCheckedChange={(checked) => updateField(name, { required: checked })}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Button onClick={() => void handleCreateOrUpdate()}>保存 Schema</Button>

      <Dialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认覆盖 Schema</DialogTitle>
            <DialogDescription>
              {prompt.schema?.isTemplate
                ? "这是一个全局 Schema 模板，保存将覆盖模板配置。"
                : `当前 Schema 被 ${linkedCount} 个 Prompt 引用，保存将同时影响它们的表单配置。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOverwriteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="secondary" onClick={() => void persistSchema(true).then(() => setOverwriteDialogOpen(false))}>
              另存为副本
            </Button>
            <Button onClick={() => void persistSchema(false).then(() => setOverwriteDialogOpen(false))}>
              覆盖保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
