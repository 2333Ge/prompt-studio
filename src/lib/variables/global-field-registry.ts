import { schemaRepository } from "@/lib/repositories/dexie-repositories";
import { createDefaultField } from "@/lib/variables/parser";
import type { VariableFieldDefinition, VariableSchema } from "@/types";

export const DEFAULT_GLOBAL_TEMPLATE_NAME = "用户变量";

/** Sentinel for prompt-local fields not yet assigned to a global schema group. */
export const LOCAL_FIELD_SCHEMA_ID = "__local__";

export interface GlobalFieldLocation {
  schema: VariableSchema;
  definition: VariableFieldDefinition;
}

export async function findGlobalField(key: string): Promise<GlobalFieldLocation | null> {
  const templates = await schemaRepository.getTemplates();
  for (const schema of templates) {
    if (key in schema.fields) {
      return {
        schema,
        definition: schema.fields[key],
      };
    }
  }
  return null;
}

export async function resolveFieldDefinition(key: string): Promise<VariableFieldDefinition> {
  const global = await findGlobalField(key);
  if (global) return structuredClone(global.definition);
  return createDefaultField(key);
}

export async function resolveFieldsForKeys(keys: string[]): Promise<Record<string, VariableFieldDefinition>> {
  const fields: Record<string, VariableFieldDefinition> = {};
  await Promise.all(
    keys.map(async (key) => {
      fields[key] = await resolveFieldDefinition(key);
    }),
  );
  return fields;
}

export function isSameFieldDefinition(
  a: VariableFieldDefinition,
  b: VariableFieldDefinition,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function getOrCreateDefaultTemplate(): Promise<VariableSchema> {
  const templates = await schemaRepository.getTemplates();
  const existing = templates.find((schema) => schema.name === DEFAULT_GLOBAL_TEMPLATE_NAME);
  if (existing) return existing;

  return schemaRepository.create({
    name: DEFAULT_GLOBAL_TEMPLATE_NAME,
    fields: {},
    isTemplate: true,
  });
}

export async function saveGlobalFieldDefinition(
  key: string,
  definition: VariableFieldDefinition,
  options?: { targetSchemaId?: string },
): Promise<VariableSchema> {
  const existing = await findGlobalField(key);

  let target: VariableSchema;
  if (options?.targetSchemaId) {
    const schema = await schemaRepository.getById(options.targetSchemaId);
    if (!schema) throw new Error("Schema not found");
    target = schema;
  } else if (existing) {
    target = existing.schema;
  } else {
    target = await getOrCreateDefaultTemplate();
  }

  if (existing && existing.schema.id !== target.id) {
    const oldFields = { ...existing.schema.fields };
    delete oldFields[key];
    await schemaRepository.update(existing.schema.id, { fields: oldFields, isTemplate: true });
  }

  return schemaRepository.update(target.id, {
    fields: { ...target.fields, [key]: definition },
    isTemplate: true,
  });
}

export async function moveGlobalFieldToSchema(
  key: string,
  targetSchemaId: string,
): Promise<VariableSchema> {
  const existing = await findGlobalField(key);
  if (!existing) throw new Error(`Field "${key}" not found`);
  if (existing.schema.id === targetSchemaId) return existing.schema;

  return saveGlobalFieldDefinition(key, existing.definition, { targetSchemaId });
}

export async function findCrossTemplateKeyConflicts(
  fields: Record<string, VariableFieldDefinition>,
  excludeSchemaId?: string,
): Promise<Array<{ key: string; schemaName: string }>> {
  const templates = await schemaRepository.getTemplates();
  const conflicts: Array<{ key: string; schemaName: string }> = [];

  for (const key of Object.keys(fields)) {
    for (const schema of templates) {
      if (schema.id === excludeSchemaId) continue;
      if (key in schema.fields) {
        conflicts.push({ key, schemaName: schema.name });
        break;
      }
    }
  }

  return conflicts;
}
