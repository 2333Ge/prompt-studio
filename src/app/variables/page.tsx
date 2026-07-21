"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { schemaRepository } from "@/lib/repositories/dexie-repositories";
import { buildVariablePlaceholder } from "@/lib/variables/parser";
import {
  findCrossTemplateKeyConflicts,
  findGlobalField,
  moveGlobalFieldToSchema,
  saveGlobalFieldDefinition,
} from "@/lib/variables/global-field-registry";
import { FIELD_TYPE_OPTIONS } from "@/lib/variables/schema-builder";
import { VariablePrefixControls } from "@/components/prompt/variable-prefix-controls";
import type { VariableFieldDefinition, VariableFieldType, VariableSchema } from "@/types";

const defaultDefinition = (type: VariableFieldType = "text"): VariableFieldDefinition => ({
  type,
  title: "",
  required: false,
});

export default function VariablesPage() {
  const [schemas, setSchemas] = useState<VariableSchema[]>([]);
  const [search, setSearch] = useState("");

  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<VariableSchema | null>(null);
  const [schemaName, setSchemaName] = useState("");
  const [schemaFields, setSchemaFields] = useState<Record<string, VariableFieldDefinition>>({});
  const [fieldOwners, setFieldOwners] = useState<Record<string, string>>({});
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [pendingFieldSave, setPendingFieldSave] = useState<{
    key: string;
    targetSchemaId: string;
    conflictKeys: Array<{ key: string; schemaName: string }>;
  } | null>(null);
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);
  const [fieldOriginalKeys, setFieldOriginalKeys] = useState<Record<string, string>>({});
  const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  const refresh = async () => {
    const schemaList = await schemaRepository.getTemplates();
    setSchemas(schemaList);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredSchemas = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return schemas;
    return schemas.filter((schema) => {
      if (schema.name.toLowerCase().includes(keyword)) return true;
      return Object.entries(schema.fields).some(
        ([key, definition]) =>
          key.toLowerCase().includes(keyword) ||
          definition.title?.toLowerCase().includes(keyword) ||
          definition.hint?.toLowerCase().includes(keyword),
      );
    });
  }, [schemas, search]);

  const openCreateSchema = () => {
    setEditingSchema(null);
    setSchemaName("");
    setSchemaFields({});
    setFieldOwners({});
    setFieldOriginalKeys({});
    setExpandedFieldKey(null);
    setSaveHint(null);
    setSchemaDialogOpen(true);
  };

  const openEditSchema = (schema: VariableSchema) => {
    setEditingSchema(schema);
    setSchemaName(schema.name);
    setSchemaFields(structuredClone(schema.fields));
    const owners: Record<string, string> = {};
    const originals: Record<string, string> = {};
    for (const key of Object.keys(schema.fields)) {
      owners[key] = schema.id;
      originals[key] = key;
    }
    setFieldOwners(owners);
    setFieldOriginalKeys(originals);
    setExpandedFieldKey(null);
    setSaveHint(null);
    setSchemaDialogOpen(true);
  };

  const handleMoveField = async (key: string, fromSchemaId: string, targetSchemaId: string) => {
    if (fromSchemaId === targetSchemaId) return;
    await moveGlobalFieldToSchema(key, targetSchemaId);
    await refresh();
  };

  const syncEditingSchema = async (schemaId: string) => {
    const latest = await schemaRepository.getById(schemaId);
    if (!latest) return;
    setEditingSchema(latest);
    setSchemaName(latest.name);
    setSchemaFields(structuredClone(latest.fields));
    const owners: Record<string, string> = {};
    const originals: Record<string, string> = {};
    for (const fieldKey of Object.keys(latest.fields)) {
      owners[fieldKey] = latest.id;
      originals[fieldKey] = fieldKey;
    }
    setFieldOwners(owners);
    setFieldOriginalKeys(originals);
  };

  const saveSchemaName = async () => {
    const trimmedName = schemaName.trim();
    if (!trimmedName) return;

    setSavingName(true);
    try {
      if (editingSchema) {
        await schemaRepository.update(editingSchema.id, { name: trimmedName, isTemplate: true });
        await syncEditingSchema(editingSchema.id);
      } else {
        const created = await schemaRepository.create({
          name: trimmedName,
          fields: {},
          isTemplate: true,
        });
        setEditingSchema(created);
        setSchemaFields({});
        setFieldOwners({});
        setFieldOriginalKeys({});
      }
      await refresh();
    } finally {
      setSavingName(false);
    }
  };

  const removePersistedField = async (key: string, originalKey: string, ownerId: string) => {
    const schema = await schemaRepository.getById(ownerId);
    if (!schema || !(originalKey in schema.fields)) return;
    const nextFields = { ...schema.fields };
    delete nextFields[originalKey];
    await schemaRepository.update(ownerId, { fields: nextFields, isTemplate: true });
  };

  const persistFieldSave = async (key: string, targetSchemaId: string) => {
    if (!editingSchema) return;

    const definition = schemaFields[key];
    if (!definition) return;

    const originalKey = fieldOriginalKeys[key] ?? key;
    const previousOwnerId = fieldOwners[originalKey] ?? editingSchema.id;

    if (originalKey !== key) {
      await removePersistedField(key, originalKey, previousOwnerId);
    }

    await saveGlobalFieldDefinition(key, definition, { targetSchemaId });
    await syncEditingSchema(editingSchema.id);
    await refresh();
    setExpandedFieldKey(null);
    setSaveHint(null);
  };

  const saveSchemaField = async (key: string) => {
    if (!editingSchema) {
      setSaveHint("请先保存模板名称");
      return;
    }

    const definition = schemaFields[key];
    if (!definition) return;

    const targetSchemaId = fieldOwners[key] ?? editingSchema.id;
    const conflicts = await findCrossTemplateKeyConflicts({ [key]: definition }, targetSchemaId);

    if (conflicts.length > 0) {
      setPendingFieldSave({ key, targetSchemaId, conflictKeys: conflicts });
      setOverwriteDialogOpen(true);
      return;
    }

    setSavingFieldKey(key);
    try {
      await persistFieldSave(key, targetSchemaId);
    } finally {
      setSavingFieldKey(null);
    }
  };

  const persistFieldSaveWithConflictResolution = async () => {
    if (!pendingFieldSave) return;

    for (const conflict of pendingFieldSave.conflictKeys) {
      const owner = await schemaRepository.findTemplateByFieldKey(conflict.key);
      if (!owner) continue;
      const nextFields = { ...owner.schema.fields };
      delete nextFields[conflict.key];
      await schemaRepository.update(owner.schema.id, { fields: nextFields, isTemplate: true });
    }

    setSavingFieldKey(pendingFieldSave.key);
    try {
      await persistFieldSave(pendingFieldSave.key, pendingFieldSave.targetSchemaId);
    } finally {
      setSavingFieldKey(null);
      setPendingFieldSave(null);
      setOverwriteDialogOpen(false);
    }
  };

  const addSchemaField = () => {
    const baseKey = "field";
    let index = Object.keys(schemaFields).length + 1;
    let key = `${baseKey}${index}`;
    while (key in schemaFields) {
      index += 1;
      key = `${baseKey}${index}`;
    }
    setSchemaFields((current) => ({
      ...current,
      [key]: defaultDefinition(),
    }));
    setFieldOriginalKeys((current) => ({ ...current, [key]: key }));
    if (editingSchema) {
      setFieldOwners((current) => ({ ...current, [key]: editingSchema.id }));
    }
    setExpandedFieldKey(key);
  };

  const updateSchemaFieldKey = (oldKey: string, newKey: string) => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey || trimmed in schemaFields) return;
    setSchemaFields((current) => {
      const next = { ...current };
      next[trimmed] = next[oldKey];
      delete next[oldKey];
      return next;
    });
    setFieldOwners((current) => {
      if (!(oldKey in current)) return current;
      const next = { ...current };
      next[trimmed] = next[oldKey];
      delete next[oldKey];
      return next;
    });
    setFieldOriginalKeys((current) => {
      if (!(oldKey in current)) return current;
      const next = { ...current };
      next[trimmed] = current[oldKey];
      delete next[oldKey];
      return next;
    });
    setExpandedFieldKey((current) => (current === oldKey ? trimmed : current));
  };

  const updateSchemaFieldDefinition = (key: string, patch: Partial<VariableFieldDefinition>) => {
    setSchemaFields((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const removeSchemaField = async (key: string) => {
    const originalKey = fieldOriginalKeys[key] ?? key;
    const ownerId = fieldOwners[key] ?? editingSchema?.id;

    if (editingSchema && ownerId) {
      const existing = await findGlobalField(originalKey);
      if (existing && existing.schema.id === ownerId) {
        await removePersistedField(key, originalKey, ownerId);
        await syncEditingSchema(editingSchema.id);
        await refresh();
      }
    }

    setSchemaFields((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFieldOwners((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFieldOriginalKeys((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setExpandedFieldKey((current) => (current === key ? null : current));
  };

  const updateFieldOwner = (key: string, schemaId: string) => {
    setFieldOwners((current) => ({ ...current, [key]: schemaId }));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">变量管理</h1>
        <p className="text-sm text-muted-foreground">集中管理全局变量模板</p>
      </div>

      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索 Schema 或字段..." />

      <div className="space-y-4">
        <Button onClick={openCreateSchema}>
          <Plus className="h-4 w-4" />
          新建变量模板
        </Button>
        <div className="grid gap-3">
          {filteredSchemas.map((schema) => (
            <Card key={schema.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="space-y-1">
                  <p className="font-medium">{schema.name}</p>
                  <p className="text-xs text-muted-foreground">{Object.keys(schema.fields).length} 个字段</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(schema.fields).map(([key, definition]) => (
                      <FieldTag
                        key={key}
                        fieldKey={key}
                        definition={definition}
                        currentSchemaId={schema.id}
                        schemas={schemas}
                        onMove={(targetSchemaId) =>
                          void handleMoveField(key, schema.id, targetSchemaId)
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditSchema(schema)}>
                    编辑
                  </Button>
                  <ConfirmPopover
                    message="确定删除该变量模板吗？"
                    onConfirm={() => void schemaRepository.delete(schema.id).then(refresh)}
                  >
                    <Button variant="ghost" size="icon" aria-label="删除">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmPopover>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSchemas.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无变量模板</p>
          )}
        </div>
      </div>

      <Dialog
        open={schemaDialogOpen}
        onOpenChange={(open) => {
          setSchemaDialogOpen(open);
          if (!open) setExpandedFieldKey(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingSchema ? "编辑变量模板" : "新建变量模板"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>名称</Label>
                <Input value={schemaName} onChange={(event) => setSchemaName(event.target.value)} />
              </div>
              <Button
                type="button"
                onClick={() => void saveSchemaName()}
                disabled={savingName || !schemaName.trim()}
              >
                {savingName ? "保存中..." : "保存"}
              </Button>
            </div>

            {saveHint && <p className="text-sm text-amber-600 dark:text-amber-400">{saveHint}</p>}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>字段</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSchemaField}>
                  <Plus className="h-4 w-4" />
                  添加字段
                </Button>
              </div>

              {Object.keys(schemaFields).length === 0 && (
                <p className="text-sm text-muted-foreground">暂无字段，点击「添加字段」开始配置。</p>
              )}

              {Object.entries(schemaFields).map(([key, definition]) => {
                const expanded = expandedFieldKey === key;
                return (
                  <Card key={key}>
                    <CardContent className="space-y-3 p-4">
                      {!expanded ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition-colors hover:bg-muted/50"
                            onClick={() => setExpandedFieldKey(key)}
                          >
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="truncate font-mono text-sm">{key}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {definition.title?.trim() || "未设置标题"}
                              </p>
                            </div>
                          </button>
                          <ConfirmPopover
                            message="确定删除该字段吗？"
                            onConfirm={() => removeSchemaField(key)}
                          >
                            <Button variant="ghost" size="icon" aria-label="删除字段">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ConfirmPopover>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50"
                            onClick={() => setExpandedFieldKey(null)}
                            aria-label="收起"
                          >
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          </button>
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label>变量 key</Label>
                              <Input
                                defaultValue={key}
                                onBlur={(event) => updateSchemaFieldKey(key, event.target.value)}
                              />
                            </div>
                            <ConfirmPopover
                              message="确定删除该字段吗？"
                              onConfirm={() => removeSchemaField(key)}
                            >
                              <Button variant="ghost" size="icon" aria-label="删除字段">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ConfirmPopover>
                          </div>
                          {editingSchema && schemas.length > 1 && (
                            <div className="space-y-2">
                              <Label>所属分组</Label>
                              <Select
                                value={fieldOwners[key] ?? editingSchema.id}
                                onValueChange={(value) => updateFieldOwner(key, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {schemas.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <FieldDefinitionEditor
                            definition={definition}
                            onChange={(next) => updateSchemaFieldDefinition(key, next)}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              onClick={() => void saveSchemaField(key)}
                              disabled={savingFieldKey === key}
                            >
                              {savingFieldKey === key ? "保存中..." : "保存"}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchemaDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>全局变量 key 冲突</DialogTitle>
            <DialogDescription>
              以下变量 key 已在其他 Schema 中定义，全局唯一，保存将从原 Schema 中移除并写入目标分组：
              <ul className="mt-2 list-inside list-disc">
                {pendingFieldSave?.conflictKeys.map((conflict) => (
                  <li key={conflict.key}>
                    <span className="font-mono">{conflict.key}</span> → 「{conflict.schemaName}」
                  </li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOverwriteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void persistFieldSaveWithConflictResolution()}>确认保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldTag({
  fieldKey,
  definition,
  currentSchemaId,
  schemas,
  onMove,
}: {
  fieldKey: string;
  definition: VariableFieldDefinition;
  currentSchemaId: string;
  schemas: VariableSchema[];
  onMove: (targetSchemaId: string) => void;
}) {
  const otherSchemas = schemas.filter((schema) => schema.id !== currentSchemaId);
  const label = `${buildVariablePlaceholder(fieldKey)}${
    definition.default != null && definition.default !== "" ? ` = ${definition.default}` : ""
  }`;

  if (otherSchemas.length === 0) {
    return (
      <span className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground">{label}</span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="点击移动到其他分组"
        >
          {label}
          <ArrowRightLeft className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>移动到分组</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {otherSchemas.map((schema) => (
          <DropdownMenuItem key={schema.id} onClick={() => onMove(schema.id)}>
            {schema.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FieldDefinitionEditor({
  definition,
  onChange,
}: {
  definition: VariableFieldDefinition;
  onChange: (definition: VariableFieldDefinition) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>标题</Label>
        <Input
          value={definition.title ?? ""}
          onChange={(event) => onChange({ ...definition, title: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>类型</Label>
        <Select
          value={definition.type}
          onValueChange={(value) => onChange({ ...definition, type: value as VariableFieldType })}
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

      <VariablePrefixControls field={definition} onChange={(patch) => onChange({ ...definition, ...patch })} />

      {definition.type === "select" && (
        <div className="space-y-2">
          <Label>选项（逗号分隔）</Label>
          <Input
            value={(definition.options ?? []).join(", ")}
            onChange={(event) =>
              onChange({
                ...definition,
                options: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}

      {definition.type === "number" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>最小值</Label>
            <Input
              type="number"
              value={definition.min ?? ""}
              onChange={(event) =>
                onChange({
                  ...definition,
                  min: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>最大值</Label>
            <Input
              type="number"
              value={definition.max ?? ""}
              onChange={(event) =>
                onChange({
                  ...definition,
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
          value={String(definition.default ?? "")}
          onChange={(event) => onChange({ ...definition, default: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>提示说明</Label>
        <Input
          value={definition.hint ?? ""}
          onChange={(event) => onChange({ ...definition, hint: event.target.value })}
          placeholder="如：推荐 300，范围 0-1000"
        />
      </div>
    </>
  );
}
