import { createDefaultField } from "@/lib/variables/parser";
import type { VariableFieldDefinition, VariableFieldType, VariableSchema } from "@/types";

type JsonSchemaProperty = {
  type: string;
  title?: string;
  description?: string;
  default?: string | number;
  enum?: string[];
  format?: string;
  widget?: string;
  required?: boolean;
};

export function buildXRenderSchema(schema: VariableSchema | null, variableNames: string[]) {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const name of variableNames) {
    const field = schema?.fields[name] ?? { type: "text" as VariableFieldType, title: name };
    properties[name] = mapFieldToProperty(field);
    if (field.required) required.push(name);
  }

  return {
    type: "object",
    displayType: "column",
    properties,
    required,
  };
}

function mapFieldToProperty(field: VariableFieldDefinition): JsonSchemaProperty {
  const base = {
    title: field.title,
    description: field.description ?? field.hint,
    default: field.default,
  };

  switch (field.type) {
    case "textarea":
      return { ...base, type: "string", widget: "textarea" };
    case "select":
      return { ...base, type: "string", enum: field.options ?? [] };
    case "number":
      return { ...base, type: "number" };
    case "date":
      return { ...base, type: "string", format: "date", widget: "date" };
    case "image":
      return { ...base, type: "string", widget: "url", description: field.description ?? "图片 URL 或上传" };
    default:
      return { ...base, type: "string" };
  }
}

export function createSchemaFromVariables(
  name: string,
  variableNames: string[],
): Pick<VariableSchema, "name" | "fields"> {
  const fields: Record<string, VariableFieldDefinition> = {};
  for (const variable of variableNames) {
    fields[variable] = createDefaultField(variable);
  }
  return { name, fields };
}

export const FIELD_TYPE_OPTIONS: { value: VariableFieldType; label: string }[] = [
  { value: "text", label: "单行文本" },
  { value: "textarea", label: "多行文本" },
  { value: "select", label: "下拉选择" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "image", label: "图片" },
];
