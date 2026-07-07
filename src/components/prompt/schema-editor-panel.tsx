"use client";

import { useEffect, useState } from "react";
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
import { schemaRepository } from "@/lib/repositories/dexie-repositories";
import {
  findGlobalField,
  LOCAL_FIELD_SCHEMA_ID,
  resolveFieldDefinition,
  saveGlobalFieldDefinition,
} from "@/lib/variables/global-field-registry";
import { FIELD_TYPE_OPTIONS } from "@/lib/variables/schema-builder";
import { VariablePrefixControls } from "@/components/prompt/variable-prefix-controls";
import type { VariableFieldDefinition, VariableSchema } from "@/types";

interface SchemaEditorPanelProps {
  variableKey: string;
  fields: Record<string, VariableFieldDefinition>;
  onFieldsChange: (fields: Record<string, VariableFieldDefinition>) => void;
  onFieldSaved?: (fieldName: string, definition: VariableFieldDefinition) => void;
}

export function SchemaEditorPanel({
  variableKey,
  fields,
  onFieldsChange,
  onFieldSaved,
}: SchemaEditorPanelProps) {
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [pendingSaveField, setPendingSaveField] = useState<string | null>(null);
  const [pendingOwnerSchemaName, setPendingOwnerSchemaName] = useState("");
  const [pendingTargetSchemaId, setPendingTargetSchemaId] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [templates, setTemplates] = useState<VariableSchema[]>([]);
  const [fieldSchemaIds, setFieldSchemaIds] = useState<Record<string, string>>({});

  const variableNames = variableKey ? variableKey.split("\0") : [];

  useEffect(() => {
    void schemaRepository.getTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (variableNames.length === 0) return;

    let cancelled = false;
    void (async () => {
      const nextSchemaIds: Record<string, string> = {};
      let schemaIdsChanged = false;

      for (const name of variableNames) {
        if (name in fieldSchemaIds) continue;
        const existing = await findGlobalField(name);
        nextSchemaIds[name] = existing?.schema.id ?? LOCAL_FIELD_SCHEMA_ID;
        schemaIdsChanged = true;
      }

      if (!cancelled && schemaIdsChanged) {
        setFieldSchemaIds((current) => ({ ...current, ...nextSchemaIds }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableNames.join("\0")]);

  useEffect(() => {
    if (variableNames.length === 0) return;

    let cancelled = false;
    void (async () => {
      const next = { ...fields };
      let changed = false;
      for (const name of variableNames) {
        if (!(name in next)) {
          next[name] = await resolveFieldDefinition(name);
          changed = true;
        }
      }
      if (!cancelled && changed) onFieldsChange(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableKey]);

  const [saveHint, setSaveHint] = useState<string | null>(null);

  const persistField = async (fieldName: string, targetSchemaId?: string) => {
    const fieldDef = fields[fieldName];
    if (!fieldDef) return;

    const schemaId = targetSchemaId ?? fieldSchemaIds[fieldName];
    if (!schemaId || schemaId === LOCAL_FIELD_SCHEMA_ID) {
      setSaveHint("请先选择要加入的全局分组");
      setTimeout(() => setSaveHint(null), 2500);
      return;
    }

    await saveGlobalFieldDefinition(fieldName, fieldDef, { targetSchemaId: schemaId });
    setFieldSchemaIds((current) => ({ ...current, [fieldName]: schemaId }));
    onFieldSaved?.(fieldName, fieldDef);
  };

  const handleSaveField = async (fieldName: string) => {
    const targetSchemaId = fieldSchemaIds[fieldName];
    if (!targetSchemaId || targetSchemaId === LOCAL_FIELD_SCHEMA_ID) {
      setSaveHint("请先选择要加入的全局分组");
      setTimeout(() => setSaveHint(null), 2500);
      return;
    }

    const existing = await findGlobalField(fieldName);
    const isMoving =
      existing && targetSchemaId && existing.schema.id !== targetSchemaId;
    const isUpdatingSameSchema =
      existing && targetSchemaId && existing.schema.id === targetSchemaId;

    if (existing && (isUpdatingSameSchema || isMoving)) {
      setPendingSaveField(fieldName);
      setPendingOwnerSchemaName(existing.schema.name);
      setPendingTargetSchemaId(isMoving ? targetSchemaId : null);
      setOverwriteDialogOpen(true);
      return;
    }

    setSavingField(fieldName);
    try {
      await persistField(fieldName, targetSchemaId);
    } finally {
      setSavingField(null);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingSaveField) return;
    setSavingField(pendingSaveField);
    try {
      await persistField(pendingSaveField, pendingTargetSchemaId ?? fieldSchemaIds[pendingSaveField]);
    } finally {
      setSavingField(null);
      setPendingSaveField(null);
      setPendingOwnerSchemaName("");
      setPendingTargetSchemaId(null);
      setOverwriteDialogOpen(false);
    }
  };

  const updateFieldSchemaId = (name: string, schemaId: string) => {
    setFieldSchemaIds((current) => ({ ...current, [name]: schemaId }));
  };

  const updateField = (name: string, patch: Partial<VariableFieldDefinition>) => {
    onFieldsChange({
      ...fields,
      [name]: { ...fields[name], ...patch },
    });
  };

  if (variableNames.length === 0) {
    return <p className="text-sm text-muted-foreground">当前 Prompt 没有变量。</p>;
  }

  const pendingTargetSchemaName = pendingTargetSchemaId
    ? templates.find((schema) => schema.id === pendingTargetSchemaId)?.name
    : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        局部变量仅当前 Prompt 有效；保存到全局后写入所选分组，所有 Prompt 共享。
      </p>
      {saveHint && <p className="text-xs text-amber-600 dark:text-amber-400">{saveHint}</p>}
      {variableNames.map((name) => {
        const field = fields[name] ?? { type: "text", title: name };
        const targetSchemaId = fieldSchemaIds[name] ?? LOCAL_FIELD_SCHEMA_ID;
        const isLocal = targetSchemaId === LOCAL_FIELD_SCHEMA_ID;
        return (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-sm">{name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>所属分组</Label>
                <Select value={targetSchemaId} onValueChange={(value) => updateFieldSchemaId(name, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 Schema 分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LOCAL_FIELD_SCHEMA_ID}>局部变量（未加入分组）</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLocal && (
                  <p className="text-xs text-muted-foreground">此变量尚未加入全局分组，配置仅保存在当前 Prompt。</p>
                )}
              </div>
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

              <VariablePrefixControls field={field} onChange={(patch) => updateField(name, patch)} />

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

              {field.type === "number" && (
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
            <div className="flex justify-end border-t px-6 py-4">
              <Button
                size="sm"
                disabled={savingField === name}
                onClick={() => void handleSaveField(name)}
              >
                {savingField === name ? "保存中..." : isLocal ? "加入全局分组" : "保存到全局"}
              </Button>
            </div>
          </Card>
        );
      })}

      <Dialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingTargetSchemaId ? "移动全局变量" : "覆盖全局变量"}</DialogTitle>
            <DialogDescription>
              {pendingTargetSchemaId ? (
                <>
                  全局变量「{pendingSaveField}」当前在 Schema「{pendingOwnerSchemaName}」中，保存将移动到
                  「{pendingTargetSchemaName ?? "目标分组"}」并更新配置。
                </>
              ) : (
                <>
                  全局变量「{pendingSaveField}」已在 Schema「{pendingOwnerSchemaName}」中定义。变量 key
                  全局唯一，保存将覆盖该配置，影响所有使用该变量的 Prompt。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOverwriteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleConfirmOverwrite()}>覆盖保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
