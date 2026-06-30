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
import { promptRepository, schemaRepository } from "@/lib/repositories/dexie-repositories";
import { FIELD_TYPE_OPTIONS } from "@/lib/variables/schema-builder";
import type { PromptWithRelations, VariableFieldDefinition } from "@/types";

interface SchemaEditorPanelProps {
  prompt: PromptWithRelations;
  variableKey: string;
  onRefresh: () => Promise<void>;
}

export function SchemaEditorPanel({ prompt, variableKey, onRefresh }: SchemaEditorPanelProps) {
  const [fields, setFields] = useState<Record<string, VariableFieldDefinition>>({});
  const loadedSchemaId = useRef<string | null>(null);

  // 仅在 Schema 切换时从数据库加载，避免左侧编辑时覆盖本地修改
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
          next[name] = prompt.schema?.fields[name] ?? { type: "text", title: name, required: false };
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [variableKey, prompt.schema, variableNames]);

  const handleCreateOrUpdate = async () => {
    if (prompt.schema) {
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
                  onValueChange={(value) => updateField(name, { type: value as VariableFieldDefinition["type"] })}
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
              {field.type === "select" && (
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
    </div>
  );
}
