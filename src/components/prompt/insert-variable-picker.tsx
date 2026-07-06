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
import { globalVariableFieldRepository } from "@/lib/repositories/dexie-repositories";
import { buildVariablePlaceholder } from "@/lib/variables/parser";
import type { GlobalVariableField, PromptWithRelations, VariableFieldDefinition } from "@/types";

interface InsertVariablePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: PromptWithRelations;
  onInsert: (text: string) => void;
}

interface VariableOption {
  key: string;
  label: string;
  source: "global" | "schema";
  definition?: VariableFieldDefinition;
}

export function InsertVariablePicker({ open, onOpenChange, prompt, onInsert }: InsertVariablePickerProps) {
  const [search, setSearch] = useState("");
  const [globalFields, setGlobalFields] = useState<GlobalVariableField[]>([]);

  useEffect(() => {
    if (!open) return;
    void globalVariableFieldRepository.getAll().then(setGlobalFields);
    setSearch("");
  }, [open]);

  const { schemaOptions, globalOptions } = useMemo(() => {
    const schemaItems: VariableOption[] = [];
    const globalItems: VariableOption[] = [];
    const schemaKeys = new Set(Object.keys(prompt.schema?.fields ?? {}));

    for (const [key, definition] of Object.entries(prompt.schema?.fields ?? {})) {
      schemaItems.push({
        key,
        label: definition.title ?? key,
        source: "schema",
        definition,
      });
    }

    for (const field of globalFields) {
      if (schemaKeys.has(field.key)) continue;
      globalItems.push({
        key: field.key,
        label: field.definition.title ?? field.key,
        source: "global",
        definition: field.definition,
      });
    }

    const keyword = search.trim().toLowerCase();
    const filterItems = (items: VariableOption[]) =>
      keyword
        ? items.filter(
            (item) =>
              item.key.toLowerCase().includes(keyword) ||
              item.label.toLowerCase().includes(keyword) ||
              item.definition?.hint?.toLowerCase().includes(keyword),
          )
        : items;

    return {
      schemaOptions: filterItems(schemaItems).sort((a, b) => a.key.localeCompare(b.key)),
      globalOptions: filterItems(globalItems).sort((a, b) => a.key.localeCompare(b.key)),
    };
  }, [globalFields, prompt.schema?.fields, search]);

  const handleSelect = (option: VariableOption) => {
    onInsert(buildVariablePlaceholder(option.key));
    onOpenChange(false);
  };

  const hasResults = schemaOptions.length > 0 || globalOptions.length > 0;

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
          {schemaOptions.length > 0 && (
            <VariableGroup title="当前 Schema" options={schemaOptions} onSelect={handleSelect} />
          )}
          {globalOptions.length > 0 && (
            <VariableGroup title="全局字段库" options={globalOptions} onSelect={handleSelect} />
          )}
          {!hasResults && (
            <p className="py-6 text-center text-sm text-muted-foreground">没有匹配的变量</p>
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
              {option.definition?.prefixEnabled && option.definition.prefix
                ? ` · 前缀 ${option.definition.prefix.trim()}`
                : ""}
            </p>
          </div>
        </Button>
      ))}
    </div>
  );
}
