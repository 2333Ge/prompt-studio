"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mediaStorageAdapter } from "@/lib/storage/media-adapter";
import { useUIStore } from "@/lib/stores";
import type { PromptWithRelations, VariableFieldDefinition } from "@/types";

interface VariableFormPanelProps {
  prompt: PromptWithRelations;
  variableKey: string;
  fields: Record<string, VariableFieldDefinition>;
}

export function VariableFormPanel({
  prompt,
  variableKey,
  fields,
}: VariableFormPanelProps) {
  const variableValues = useUIStore((state) => state.variableValues);
  const setVariableValues = useUIStore((state) => state.setVariableValues);

  // 仅补全缺失变量的 default，不覆盖已有输入（切换 tab 会 remount，不能整表重置）
  useEffect(() => {
    const variableNames = variableKey ? variableKey.split("\0") : [];
    if (variableNames.length === 0) return;

    setVariableValues((current) => {
      let changed = false;
      const next = { ...current };
      for (const name of variableNames) {
        if (name in next) continue;
        const field = fields[name] ?? prompt.schema?.fields[name];
        if (!field) continue;
        next[name] = field.default ?? "";
        changed = true;
      }
      return changed ? next : current;
    });
  }, [fields, prompt.schema, setVariableValues, variableKey]);

  const variableNames = variableKey ? variableKey.split("\0") : [];

  const updateValue = (name: string, value: unknown) => {
    setVariableValues((current) => ({ ...current, [name]: value }));
  };

  if (variableNames.length === 0) {
    return <p className="text-sm text-muted-foreground">当前 Prompt 没有变量占位符。</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">变量输入</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {variableNames.map((name) => {
          const field = fields[name] ?? prompt.schema?.fields[name] ?? { type: "text", title: name };
          return (
            <VariableField
              key={name}
              name={name}
              field={field}
              value={variableValues[name]}
              onChange={(value) => updateValue(name, value)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function hasSchemaPrefix(field: VariableFieldDefinition): boolean {
  return Boolean(field.prefixEnabled && field.prefix);
}

function VariableField({
  name,
  field,
  value,
  onChange,
}: {
  name: string;
  field: VariableFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = field.title ?? name;
  const hint = field.hint ?? field.description;
  const showPrefix = hasSchemaPrefix(field);
  const compactClass = showPrefix ? "h-8" : undefined;

  const valueControl = (() => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
        );
      case "select":
        return (
          <Select value={String(value ?? "")} onValueChange={onChange}>
            <SelectTrigger className={compactClass}>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "number":
        return (
          <Input
            type="number"
            min={field.min}
            max={field.max}
            className={compactClass}
            value={value == null ? "" : String(value)}
            onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            className={compactClass}
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          />
        );
      case "image":
        return (
          <>
            <Input
              value={String(value ?? "")}
              onChange={(event) => onChange(event.target.value)}
              placeholder="图片 URL"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const url = await mediaStorageAdapter.upload(file);
                onChange(url);
              }}
            />
          </>
        );
      default:
        return (
          <Input
            className={compactClass}
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          />
        );
    }
  })();

  const wrappedControl =
    showPrefix && field.type !== "textarea" && field.type !== "image" ? (
      <div className="flex items-center gap-2">
        <span className="shrink-0 font-mono text-sm text-muted-foreground">{field.prefix!.trimEnd()}</span>
        <div className="min-w-0 flex-1">{valueControl}</div>
      </div>
    ) : (
      valueControl
    );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {showPrefix && (field.type === "textarea" || field.type === "image") && (
        <span className="font-mono text-xs text-muted-foreground">{field.prefix!.trimEnd()}</span>
      )}
      {wrappedControl}
    </div>
  );
}
