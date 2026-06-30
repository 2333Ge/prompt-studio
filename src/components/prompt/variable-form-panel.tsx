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
  variableNames: string[];
}

export function VariableFormPanel({ prompt, variableNames }: VariableFormPanelProps) {
  const variableValues = useUIStore((state) => state.variableValues);
  const setVariableValues = useUIStore((state) => state.setVariableValues);

  useEffect(() => {
    if (!prompt.schema) return;
    const defaults: Record<string, unknown> = {};
    for (const name of variableNames) {
      const field = prompt.schema.fields[name];
      if (field?.default != null) {
        defaults[name] = field.default;
      }
    }
    setVariableValues(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt.id, prompt.schema?.id, variableNames, setVariableValues]);

  const updateValue = (name: string, value: unknown) => {
    setVariableValues({ ...variableValues, [name]: value });
  };

  if (variableNames.length === 0) {
    return <p className="text-sm text-muted-foreground">当前 Prompt 没有变量占位符。</p>;
  }

  if (!prompt.schema) {
    return <p className="text-sm text-muted-foreground">请先创建 Schema 后再填写变量。</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">变量输入</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {variableNames.map((name) => {
          const field = prompt.schema!.fields[name] ?? { type: "text", title: name };
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

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Select value={String(value ?? "")} onValueChange={onChange}>
            <SelectTrigger>
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
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            type="number"
            value={value == null ? "" : String(value)}
            onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          />
        </div>
      );
    case "date":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input type="date" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
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
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          <Label>{label}</Label>
          <Input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
        </div>
      );
  }
}
