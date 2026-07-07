import { createDefaultField, findMissingVariables, parseVariables } from "@/lib/variables/parser";
import { resolveFieldDefinition } from "@/lib/variables/global-field-registry";
import type { VariableFieldDefinition, VariableSchema } from "@/types";

export async function syncSchemaFromContent(
  content: string,
  _title: string,
  existingSchema: VariableSchema | null | undefined,
  fieldsOverride?: Record<string, VariableFieldDefinition>,
): Promise<{ schemaId: string | null; fields: Record<string, VariableFieldDefinition> }> {
  const variableNames = parseVariables(content);

  if (variableNames.length === 0) {
    return {
      schemaId: existingSchema?.id ?? null,
      fields: fieldsOverride ?? {},
    };
  }

  const fields: Record<string, VariableFieldDefinition> = { ...(fieldsOverride ?? {}) };
  for (const name of variableNames) {
    if (!(name in fields)) {
      fields[name] = await resolveFieldDefinition(name);
    }
  }

  if (fieldsOverride) {
    return { schemaId: existingSchema?.id ?? null, fields };
  }

  const definedKeys = existingSchema ? Object.keys(existingSchema.fields) : [];
  const missing = findMissingVariables(content, definedKeys);
  if (missing.length === 0 && existingSchema) {
    return { schemaId: existingSchema.id, fields: existingSchema.fields };
  }

  return { schemaId: existingSchema?.id ?? null, fields };
}

export { createDefaultField };
