"use client";

import { useEffect, useRef } from "react";
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
import { VariablePrefixControls } from "@/components/prompt/variable-prefix-controls";
import type { PromptWithRelations, VariableFieldDefinition } from "@/types";

interface VariableFormPanelProps {
  prompt: PromptWithRelations;
  variableKey: string;
  fields: Record<string, VariableFieldDefinition>;
  onUpdateField: (name: string, patch: Partial<VariableFieldDefinition>) => void;
}

export function VariableFormPanel({
  prompt,
  variableKey,
  fields,
  onUpdateField,
}: VariableFormPanelProps) {
  const variableValues = useUIStore((state) => state.variableValues);
  const setVariableValues = useUIStore((state) => state.setVariableValues);
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    const initKey = `${prompt.id}:${prompt.schema?.id ?? "none"}`;
    const variableNames = variableKey ? variableKey.split("\0") : [];

    if (initializedFor.current !== initKey) {
      initializedFor.current = initKey;
      const initial: Record<string, unknown> = {};
      for (const name of variableNames) {
        const field = fields[name] ?? prompt.schema?.fields[name];
        initial[name] = field?.default ?? "";
      }
      setVariableValues(initial);
      return;
    }

    setVariableValues((current) => {
      let changed = false;
      const next = { ...current };
      for (const name of variableNames) {
        if (!(name in next)) {
          const field = fields[name] ?? prompt.schema?.fields[name];
          next[name] = field?.default ?? "";
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [fields, prompt.id, prompt.schema, prompt.schema?.id, setVariableValues, variableKey]);

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
              onFieldChange={(patch) => onUpdateField(name, patch)}
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
  onFieldChange,
}: {
  name: string;
  field: VariableFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onFieldChange: (patch: Partial<VariableFieldDefinition>) => void;
}) {
  const label = field.title ?? name;
  const hint = field.hint ?? field.description;

  const valueControl = (() => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
        );
      case "select":
        return (
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
        );
      case "number":
        return (
          <Input
            type="number"
            min={field.min}
            max={field.max}
            value={value == null ? "" : String(value)}
            onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
          />
        );
      case "date":
        return (
          <Input type="date" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
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
        return <Input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
    }
  })();

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {valueControl}
      <VariablePrefixControls field={field} onChange={onFieldChange} compact />
    </div>
  );
}
