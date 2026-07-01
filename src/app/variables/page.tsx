"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  globalVariableFieldRepository,
  promptRepository,
  schemaRepository,
} from "@/lib/repositories/dexie-repositories";
import { buildVariablePlaceholder } from "@/lib/variables/parser";
import { FIELD_TYPE_OPTIONS, FLAG_VALUE_TYPE_OPTIONS } from "@/lib/variables/schema-builder";
import type {
  FlagValueType,
  GlobalVariableField,
  VariableFieldDefinition,
  VariableFieldType,
  VariableMorph,
  VariableSchema,
} from "@/types";

const defaultDefinition = (type: VariableFieldType = "text"): VariableFieldDefinition => ({
  type,
  title: "",
  required: false,
});

export default function VariablesPage() {
  const [globalFields, setGlobalFields] = useState<GlobalVariableField[]>([]);
  const [schemas, setSchemas] = useState<VariableSchema[]>([]);
  const [schemaCounts, setSchemaCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<GlobalVariableField | null>(null);
  const [fieldKey, setFieldKey] = useState("");
  const [fieldMorph, setFieldMorph] = useState<VariableMorph>("inline");
  const [fieldDefinition, setFieldDefinition] = useState<VariableFieldDefinition>(defaultDefinition());

  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<VariableSchema | null>(null);
  const [schemaName, setSchemaName] = useState("");
  const [schemaFieldsJson, setSchemaFieldsJson] = useState("{}");
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [pendingSchemaSave, setPendingSchemaSave] = useState<VariableSchema | null>(null);

  const refresh = async () => {
    const [fields, schemaList] = await Promise.all([
      globalVariableFieldRepository.getAll(),
      schemaRepository.getAll(),
    ]);
    setGlobalFields(fields);
    setSchemas(schemaList);

    const counts: Record<string, number> = {};
    await Promise.all(
      schemaList.map(async (schema) => {
        counts[schema.id] = await promptRepository.countBySchemaId(schema.id);
      }),
    );
    setSchemaCounts(counts);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredFields = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return globalFields;
    return globalFields.filter(
      (field) =>
        field.key.toLowerCase().includes(keyword) ||
        field.definition.title?.toLowerCase().includes(keyword) ||
        field.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    );
  }, [globalFields, search]);

  const openCreateField = () => {
    setEditingField(null);
    setFieldKey("");
    setFieldMorph("inline");
    setFieldDefinition(defaultDefinition());
    setFieldDialogOpen(true);
  };

  const openEditField = (field: GlobalVariableField) => {
    setEditingField(field);
    setFieldKey(field.key);
    setFieldMorph(field.morph);
    setFieldDefinition({ ...field.definition });
    setFieldDialogOpen(true);
  };

  const saveField = async () => {
    if (!fieldKey.trim()) return;
    const definition = {
      ...fieldDefinition,
      title: fieldDefinition.title || fieldKey.trim(),
      type: fieldMorph === "flag" ? "flag" : fieldDefinition.type === "flag" ? "text" : fieldDefinition.type,
    } as VariableFieldDefinition;

    if (editingField) {
      await globalVariableFieldRepository.update(editingField.id, {
        key: fieldKey.trim(),
        morph: fieldMorph,
        definition,
      });
    } else {
      await globalVariableFieldRepository.create({
        key: fieldKey.trim(),
        morph: fieldMorph,
        definition,
      });
    }
    setFieldDialogOpen(false);
    await refresh();
  };

  const openCreateSchema = () => {
    setEditingSchema(null);
    setSchemaName("");
    setSchemaFieldsJson("{}");
    setSchemaDialogOpen(true);
  };

  const openEditSchema = (schema: VariableSchema) => {
    setEditingSchema(schema);
    setSchemaName(schema.name);
    setSchemaFieldsJson(JSON.stringify(schema.fields, null, 2));
    setSchemaDialogOpen(true);
  };

  const persistSchema = async (saveAsCopy = false) => {
    let fields: Record<string, VariableFieldDefinition>;
    try {
      fields = JSON.parse(schemaFieldsJson) as Record<string, VariableFieldDefinition>;
    } catch {
      alert("Schema JSON 格式无效");
      return;
    }

    if (saveAsCopy && editingSchema) {
      const cloned = await schemaRepository.clone(editingSchema.id, `${schemaName} (副本)`);
      await schemaRepository.update(cloned.id, { fields, isTemplate: true });
    } else if (editingSchema) {
      await schemaRepository.update(editingSchema.id, { name: schemaName, fields, isTemplate: true });
    } else {
      await schemaRepository.create({ name: schemaName, fields, isTemplate: true });
    }

    setSchemaDialogOpen(false);
    setOverwriteDialogOpen(false);
    setPendingSchemaSave(null);
    await refresh();
  };

  const saveSchema = async () => {
    if (!schemaName.trim()) return;

    if (editingSchema) {
      const count = schemaCounts[editingSchema.id] ?? 0;
      if (count > 1) {
        setPendingSchemaSave(editingSchema);
        setOverwriteDialogOpen(true);
        return;
      }
    }

    await persistSchema(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">变量管理</h1>
        <p className="text-sm text-muted-foreground">集中管理全局字段库与 Schema 模板</p>
      </div>

      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索字段或模板..." />

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">全局字段库</TabsTrigger>
          <TabsTrigger value="schemas">Schema 模板</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="mt-4 space-y-4">
          <Button onClick={openCreateField}>
            <Plus className="h-4 w-4" />
            新建字段
          </Button>
          <div className="grid gap-3">
            {filteredFields.map((field) => (
              <Card key={field.id}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{field.definition.title ?? field.key}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {buildVariablePlaceholder(field.key, field.morph)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      类型: {field.definition.type}
                      {field.definition.hint ? ` · ${field.definition.hint}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditField(field)}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void globalVariableFieldRepository.delete(field.id).then(refresh)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredFields.length === 0 && (
              <p className="text-sm text-muted-foreground">暂无全局字段</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schemas" className="mt-4 space-y-4">
          <Button onClick={openCreateSchema}>
            <Plus className="h-4 w-4" />
            新建 Schema 模板
          </Button>
          <div className="grid gap-3">
            {schemas
              .filter((schema) => schema.isTemplate || Object.keys(schema.fields).length > 0)
              .map((schema) => (
                <Card key={schema.id}>
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{schema.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(schema.fields).length} 个字段 · 被 {schemaCounts[schema.id] ?? 0} 个 Prompt 引用
                        {schema.isTemplate ? " · 模板" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditSchema(schema)}>
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void schemaRepository.delete(schema.id).then(refresh)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? "编辑字段" : "新建字段"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>变量 key</Label>
              <Input value={fieldKey} onChange={(event) => setFieldKey(event.target.value)} placeholder="ar" />
            </div>
            <div className="space-y-2">
              <Label>形态</Label>
              <Select value={fieldMorph} onValueChange={(value) => setFieldMorph(value as VariableMorph)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">行内 {"{{key}}"}</SelectItem>
                  <SelectItem value="flag">参数 {"[[ --key ]]"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FieldDefinitionEditor definition={fieldDefinition} morph={fieldMorph} onChange={setFieldDefinition} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void saveField()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={schemaDialogOpen} onOpenChange={setSchemaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSchema ? "编辑 Schema 模板" : "新建 Schema 模板"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={schemaName} onChange={(event) => setSchemaName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>字段 JSON</Label>
              <Textarea
                value={schemaFieldsJson}
                onChange={(event) => setSchemaFieldsJson(event.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchemaDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void saveSchema()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认覆盖 Schema</DialogTitle>
            <DialogDescription>
              模板「{pendingSchemaSave?.name}」被 {pendingSchemaSave ? schemaCounts[pendingSchemaSave.id] : 0}{" "}
              个 Prompt 引用，保存将覆盖它们的表单配置。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOverwriteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="secondary" onClick={() => void persistSchema(true)}>
              另存为副本
            </Button>
            <Button onClick={() => void persistSchema(false)}>覆盖保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldDefinitionEditor({
  definition,
  morph,
  onChange,
}: {
  definition: VariableFieldDefinition;
  morph: VariableMorph;
  onChange: (definition: VariableFieldDefinition) => void;
}) {
  const isFlag = morph === "flag" || definition.type === "flag";

  return (
    <>
      <div className="space-y-2">
        <Label>标题</Label>
        <Input
          value={definition.title ?? ""}
          onChange={(event) => onChange({ ...definition, title: event.target.value })}
        />
      </div>
      {!isFlag && (
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
              {FIELD_TYPE_OPTIONS.filter((item) => item.value !== "flag").map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isFlag && (
        <>
          <div className="space-y-2">
            <Label>参数前缀</Label>
            <Input
              value={definition.flag ?? ""}
              onChange={(event) => onChange({ ...definition, flag: event.target.value })}
              placeholder="--ar"
            />
          </div>
          <div className="space-y-2">
            <Label>值类型</Label>
            <Select
              value={definition.valueType ?? "text"}
              onValueChange={(value) => onChange({ ...definition, valueType: value as FlagValueType })}
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
              checked={Boolean(definition.omitIfDefault)}
              onCheckedChange={(checked) => onChange({ ...definition, omitIfDefault: checked })}
            />
          </div>
        </>
      )}
      {(definition.type === "select" || (isFlag && definition.valueType === "select")) && (
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
