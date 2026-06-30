import { schemaRepository } from "@/lib/repositories/dexie-repositories";
import { createDefaultField, findMissingVariables, parseVariables } from "@/lib/variables/parser";
import { createSchemaFromVariables } from "@/lib/variables/schema-builder";
import type { VariableFieldDefinition, VariableSchema } from "@/types";

export async function syncSchemaFromContent(
  content: string,
  title: string,
  existingSchema: VariableSchema | null | undefined,
): Promise<{ schemaId: string | null; fields: Record<string, VariableFieldDefinition> }> {
  const variableNames = parseVariables(content);

  if (variableNames.length === 0) {
    return {
      schemaId: existingSchema?.id ?? null,
      fields: existingSchema?.fields ?? {},
    };
  }

  if (existingSchema) {
    const missing = findMissingVariables(content, Object.keys(existingSchema.fields));
    if (missing.length === 0) {
      return { schemaId: existingSchema.id, fields: existingSchema.fields };
    }

    const fields = { ...existingSchema.fields };
    for (const name of missing) {
      fields[name] = createDefaultField(name);
    }
    const updated = await schemaRepository.update(existingSchema.id, { fields });
    return { schemaId: updated.id, fields: updated.fields };
  }

  const schema = await schemaRepository.create(createSchemaFromVariables(`${title} Schema`, variableNames));
  return { schemaId: schema.id, fields: schema.fields };
}
