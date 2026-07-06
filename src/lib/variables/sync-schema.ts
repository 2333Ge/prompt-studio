import { globalVariableFieldRepository, schemaRepository } from "@/lib/repositories/dexie-repositories";
import { createDefaultField, findMissingVariables, parseVariables } from "@/lib/variables/parser";
import type { VariableFieldDefinition, VariableSchema } from "@/types";

async function resolveFieldDefinition(name: string): Promise<VariableFieldDefinition> {
  const globalField = await globalVariableFieldRepository.getByKey(name);
  if (globalField) {
    return structuredClone(globalField.definition);
  }
  return createDefaultField(name);
}

export async function syncSchemaFromContent(
  content: string,
  title: string,
  existingSchema: VariableSchema | null | undefined,
  fieldsOverride?: Record<string, VariableFieldDefinition>,
): Promise<{ schemaId: string | null; fields: Record<string, VariableFieldDefinition> }> {
  const variableNames = parseVariables(content);

  if (variableNames.length === 0) {
    return {
      schemaId: existingSchema?.id ?? null,
      fields: fieldsOverride ?? existingSchema?.fields ?? {},
    };
  }

  if (existingSchema) {
    const baseFields = fieldsOverride ?? existingSchema.fields;
    const missing = findMissingVariables(content, Object.keys(baseFields));

    if (missing.length === 0 && !fieldsOverride) {
      return { schemaId: existingSchema.id, fields: existingSchema.fields };
    }

    const fields = { ...baseFields };
    for (const name of missing) {
      fields[name] = await resolveFieldDefinition(name);
    }
    const updated = await schemaRepository.update(existingSchema.id, { fields });
    return { schemaId: updated.id, fields: updated.fields };
  }

  const fields: Record<string, VariableFieldDefinition> = { ...(fieldsOverride ?? {}) };
  for (const name of variableNames) {
    if (!(name in fields)) {
      fields[name] = await resolveFieldDefinition(name);
    }
  }

  const schema = await schemaRepository.create({
    name: `${title} Schema`,
    fields,
  });
  return { schemaId: schema.id, fields: schema.fields };
}
