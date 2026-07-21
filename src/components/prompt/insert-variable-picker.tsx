"use client";

import { useEffect, useMemo, useState } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { schemaRepository } from "@/lib/repositories/dexie-repositories";
import { buildVariablePlaceholder } from "@/lib/variables/parser";
import type { VariableFieldDefinition, VariableSchema } from "@/types";

interface InsertVariablePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (key: string, definition: VariableFieldDefinition) => void;
}

interface VariableOption {
  key: string;
  label: string;
  templateName: string;
  definition: VariableFieldDefinition;
}

export function InsertVariablePicker({ open, onOpenChange, onInsert }: InsertVariablePickerProps) {
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<VariableSchema[]>([]);

  useEffect(() => {
    if (!open) return;
    void schemaRepository.getTemplates().then(setTemplates);
    setSearch("");
  }, [open]);

  const groupedOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const groups = new Map<string, VariableOption[]>();

    for (const template of templates) {
      for (const [key, definition] of Object.entries(template.fields)) {
        const label = definition.title ?? key;
        if (
          keyword &&
          !key.toLowerCase().includes(keyword) &&
          !label.toLowerCase().includes(keyword) &&
          !definition.hint?.toLowerCase().includes(keyword)
        ) {
          continue;
        }

        const items = groups.get(template.name) ?? [];
        items.push({
          key,
          label,
          templateName: template.name,
          definition,
        });
        groups.set(template.name, items);
      }
    }

    for (const [name, items] of groups) {
      items.sort((a, b) => a.key.localeCompare(b.key));
      groups.set(name, items);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [search, templates]);

  const handleSelect = (option: VariableOption) => {
    onInsert(option.key, structuredClone(option.definition));
    onOpenChange(false);
  };

  const hasResults = groupedOptions.some(([, items]) => items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>插入变量</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索变量名、标题..."
        />
        <div className="max-h-80 space-y-3 overflow-auto">
          {groupedOptions.map(([templateName, options]) => (
            <VariableGroup
              key={templateName}
              title={templateName}
              options={options}
              onSelect={handleSelect}
            />
          ))}
          {!hasResults && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {templates.length === 0 ? "暂无全局变量模板" : "没有匹配的变量"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VariableGroup({
  title,
  options,
  onSelect,
}: {
  title: string;
  options: VariableOption[];
  onSelect: (option: VariableOption) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {options.map((option) => (
        <Button
          key={`${title}-${option.key}`}
          variant="ghost"
          className="h-auto w-full justify-start px-2 py-2"
          onClick={() => onSelect(option)}
        >
          <Braces className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 text-left">
            <p className="truncate font-medium">{option.label}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {buildVariablePlaceholder(option.key)}
              {option.definition.prefixEnabled && option.definition.prefix
                ? ` · 前缀 ${option.definition.prefix.trim()}`
                : ""}
            </p>
          </div>
        </Button>
      ))}
    </div>
  );
}
