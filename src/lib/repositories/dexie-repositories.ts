import type { Table } from "dexie";
import { flattenTagName } from "@/lib/db/migrate-tags";
import { generateId } from "@/lib/utils";
import { getDb } from "@/lib/db";
import type {
  Category,
  ExportBundle,
  ImportConflictStrategy,
  Prompt,
  PromptQueryOptions,
  PromptResult,
  PromptVersion,
  PromptWithRelations,
  Tag,
  VariableFieldDefinition,
  VariableSchema,
} from "@/types";
import { findGlobalField } from "@/lib/variables/global-field-registry";
import type {
  CategoryRepository,
  ImportExportRepository,
  PromptRepository,
  ResultRepository,
  SchemaRepository,
  TagRepository,
  VersionRepository,
} from "./interfaces";

const now = () => new Date().toISOString();

async function hydratePrompt(prompt: Prompt): Promise<PromptWithRelations> {
  const db = getDb();
  const [category, promptTags, schema] = await Promise.all([
    prompt.categoryId ? db.categories.get(prompt.categoryId) : Promise.resolve(undefined),
    db.promptTags.where("promptId").equals(prompt.id).toArray(),
    prompt.schemaId ? db.variableSchemas.get(prompt.schemaId) : Promise.resolve(undefined),
  ]);

  const tagIds = promptTags.map((item) => item.tagId);
  const tags = tagIds.length ? await db.tags.bulkGet(tagIds) : [];

  return {
    ...prompt,
    category: category ?? null,
    tags: tags.filter(Boolean) as Tag[],
    schema: schema ?? null,
  };
}

function matchesSearch(prompt: PromptWithRelations, search: string): boolean {
  const keyword = search.toLowerCase();
  return (
    prompt.title.toLowerCase().includes(keyword) ||
    prompt.notes.toLowerCase().includes(keyword) ||
    prompt.content.toLowerCase().includes(keyword) ||
    prompt.tags.some((tag) => tag.name.toLowerCase().includes(keyword))
  );
}

function compareTitles(left: string, right: string, sortOrder: "asc" | "desc"): number {
  const result = left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" });
  return sortOrder === "asc" ? result : -result;
}

function sortPrompts(prompts: PromptWithRelations[], options?: PromptQueryOptions): PromptWithRelations[] {
  const sortBy = options?.sortBy ?? "updatedAt";
  const sortOrder = options?.sortOrder ?? "desc";

  return [...prompts].sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];

    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;

    if (typeof left === "string" && typeof right === "string") {
      return compareTitles(left, right, sortOrder);
    }

    if (typeof left === "number" && typeof right === "number") {
      return sortOrder === "asc" ? left - right : right - left;
    }

    return 0;
  });
}

export class DexiePromptRepository implements PromptRepository {
  async getById(id: string, includePrivate = false): Promise<PromptWithRelations | null> {
    const prompt = await getDb().prompts.get(id);
    if (!prompt) return null;
    if (prompt.isPrivate && !includePrivate) return null;
    return hydratePrompt(prompt);
  }

  async query(options: PromptQueryOptions = {}): Promise<PromptWithRelations[]> {
    const db = getDb();
    let prompts = await db.prompts.toArray();

    if (!options.includePrivate) {
      prompts = prompts.filter((prompt) => !prompt.isPrivate);
    }

    let hydrated = await Promise.all(prompts.map(hydratePrompt));

    if (options.categoryId) {
      hydrated = hydrated.filter((prompt) => prompt.categoryId === options.categoryId);
    }

    if (options.tagIds?.length) {
      hydrated = hydrated.filter((prompt) =>
        options.tagIds!.every((tagId) => prompt.tags.some((tag) => tag.id === tagId)),
      );
    }

    if (options.isFavorite) {
      hydrated = hydrated.filter((prompt) => prompt.isFavorite);
    }

    if (options.privateFilter === "private") {
      hydrated = hydrated.filter((prompt) => prompt.isPrivate);
    } else if (options.privateFilter === "public") {
      hydrated = hydrated.filter((prompt) => !prompt.isPrivate);
    }

    if (options.minRating) {
      hydrated = hydrated.filter((prompt) => prompt.rating >= (options.minRating ?? 0));
    }

    if (options.search) {
      hydrated = hydrated.filter((prompt) => matchesSearch(prompt, options.search!));
    }

    return sortPrompts(hydrated, options);
  }

  async create(input: Partial<Prompt> & Pick<Prompt, "title">): Promise<PromptWithRelations> {
    const timestamp = now();
    const prompt: Prompt = {
      id: generateId(),
      title: input.title,
      content: input.content ?? "",
      notes: input.notes ?? "",
      categoryId: input.categoryId ?? null,
      rating: input.rating ?? 0,
      isFavorite: input.isFavorite ?? false,
      isPrivate: input.isPrivate ?? false,
      schemaId: input.schemaId ?? null,
      currentVersionId: null,
      mediaRefs: input.mediaRefs ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastUsedAt: null,
    };

    await getDb().prompts.add(prompt);
    return hydratePrompt(prompt);
  }

  async update(id: string, input: Partial<Prompt>): Promise<PromptWithRelations> {
    const existing = await getDb().prompts.get(id);
    if (!existing) {
      throw new Error("Prompt not found");
    }

    const updated: Prompt = {
      ...existing,
      ...input,
      id,
      updatedAt: now(),
    };

    await getDb().prompts.put(updated);
    return hydratePrompt(updated);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.transaction("rw", [db.prompts, db.promptTags, db.versions, db.results], async () => {
      await db.promptTags.where("promptId").equals(id).delete();
      await db.versions.where("promptId").equals(id).delete();
      await db.results.where("promptId").equals(id).delete();
      await db.prompts.delete(id);
    });
  }

  async duplicate(id: string): Promise<PromptWithRelations> {
    const source = await this.getById(id, true);
    if (!source) throw new Error("Prompt not found");

    let schemaId = source.schemaId;
    if (source.schema) {
      const cloned = await schemaRepository.clone(source.schema.id, `${source.schema.name} (副本)`);
      schemaId = cloned.id;
    }

    const duplicate = await this.create({
      title: `${source.title} (副本)`,
      content: source.content,
      notes: source.notes,
      categoryId: source.categoryId,
      rating: source.rating,
      isFavorite: source.isFavorite,
      isPrivate: source.isPrivate,
      schemaId,
    });

    await this.setTags(
      duplicate.id,
      source.tags.map((tag) => tag.id),
    );

    return (await this.getById(duplicate.id, true))!;
  }

  async setTags(promptId: string, tagIds: string[]): Promise<void> {
    const db = getDb();
    await db.transaction("rw", db.promptTags, async () => {
      await db.promptTags.where("promptId").equals(promptId).delete();
      await db.promptTags.bulkAdd(
        tagIds.map((tagId) => ({
          id: generateId(),
          promptId,
          tagId,
        })),
      );
    });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.update(id, { lastUsedAt: now() });
  }
}

export class DexieCategoryRepository implements CategoryRepository {
  async getAll(): Promise<Category[]> {
    return getDb().categories.orderBy("name").toArray();
  }

  async create(name: string): Promise<Category> {
    const timestamp = now();
    const category: Category = {
      id: generateId(),
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await getDb().categories.add(category);
    return category;
  }

  async update(id: string, name: string): Promise<Category> {
    const existing = await getDb().categories.get(id);
    if (!existing) throw new Error("Category not found");
    const updated = { ...existing, name, updatedAt: now() };
    await getDb().categories.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.transaction("rw", [db.categories, db.prompts], async () => {
      const prompts = await db.prompts.where("categoryId").equals(id).toArray();
      await Promise.all(prompts.map((prompt) => db.prompts.put({ ...prompt, categoryId: null })));
      await db.categories.delete(id);
    });
  }

  async findOrCreate(name: string): Promise<Category> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name required");
    const existing = await getDb().categories.toArray();
    const found = existing.find((category) => category.name.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;
    return this.create(trimmed);
  }
}

export class DexieTagRepository implements TagRepository {
  async getAll(): Promise<Tag[]> {
    return getDb().tags.orderBy("name").toArray();
  }

  async create(name: string): Promise<Tag> {
    const flatName = flattenTagName(name.trim());
    const tag: Tag = { id: generateId(), name: flatName, createdAt: now() };
    await getDb().tags.add(tag);
    return tag;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.transaction("rw", [db.tags, db.promptTags], async () => {
      await db.promptTags.where("tagId").equals(id).delete();
      await db.tags.delete(id);
    });
  }

  async findOrCreate(names: string[]): Promise<Tag[]> {
    const db = getDb();
    const existing = await db.tags.toArray();
    const results: Tag[] = [];

    for (const rawName of names) {
      const name = flattenTagName(rawName.trim());
      if (!name) continue;
      const found = existing.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
      if (found) {
        results.push(found);
      } else {
        const created = await this.create(name);
        existing.push(created);
        results.push(created);
      }
    }

    return results;
  }
}

export class DexieVersionRepository implements VersionRepository {
  async getByPromptId(promptId: string): Promise<PromptVersion[]> {
    return getDb().versions.where("promptId").equals(promptId).reverse().sortBy("createdAt");
  }

  async create(input: Omit<PromptVersion, "id" | "createdAt">): Promise<PromptVersion> {
    const version: PromptVersion = {
      ...input,
      id: generateId(),
      createdAt: now(),
    };
    await getDb().versions.add(version);
    return version;
  }

  async getById(id: string): Promise<PromptVersion | null> {
    return (await getDb().versions.get(id)) ?? null;
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    const version = await db.versions.get(id);
    if (!version) return;

    await db.transaction("rw", [db.prompts, db.versions], async () => {
      const prompt = await db.prompts.get(version.promptId);
      if (prompt?.currentVersionId === id) {
        await db.prompts.update(version.promptId, { currentVersionId: null });
      }
      await db.versions.delete(id);
    });
  }
}

export class DexieResultRepository implements ResultRepository {
  async getByPromptId(promptId: string): Promise<PromptResult[]> {
    return getDb().results.where("promptId").equals(promptId).reverse().sortBy("createdAt");
  }

  async create(input: Omit<PromptResult, "id" | "createdAt">): Promise<PromptResult> {
    const result: PromptResult = {
      ...input,
      id: generateId(),
      createdAt: now(),
    };
    await getDb().results.add(result);
    return result;
  }

  async delete(id: string): Promise<void> {
    await getDb().results.delete(id);
  }
}

export class DexieSchemaRepository implements SchemaRepository {
  async getById(id: string): Promise<VariableSchema | null> {
    return (await getDb().variableSchemas.get(id)) ?? null;
  }

  async getAll(): Promise<VariableSchema[]> {
    return getDb().variableSchemas.orderBy("updatedAt").reverse().toArray();
  }

  async getTemplates(): Promise<VariableSchema[]> {
    const all = await this.getAll();
    return all.filter((schema) => schema.isTemplate);
  }

  async findTemplateByFieldKey(
    key: string,
  ): Promise<{ schema: VariableSchema; definition: VariableFieldDefinition } | null> {
    return findGlobalField(key);
  }

  async create(
    input: Pick<VariableSchema, "name" | "fields"> & Partial<Pick<VariableSchema, "isTemplate">>,
  ): Promise<VariableSchema> {
    const timestamp = now();
    const schema: VariableSchema = {
      id: generateId(),
      name: input.name,
      fields: input.fields,
      isTemplate: input.isTemplate ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await getDb().variableSchemas.add(schema);
    return schema;
  }

  async update(
    id: string,
    input: Partial<Pick<VariableSchema, "name" | "fields" | "isTemplate">>,
  ): Promise<VariableSchema> {
    const existing = await getDb().variableSchemas.get(id);
    if (!existing) throw new Error("Schema not found");
    const updated = { ...existing, ...input, updatedAt: now() };
    await getDb().variableSchemas.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await getDb().variableSchemas.delete(id);
  }

  async clone(id: string, name?: string): Promise<VariableSchema> {
    const existing = await getDb().variableSchemas.get(id);
    if (!existing) throw new Error("Schema not found");
    return this.create({
      name: name ?? `${existing.name} (副本)`,
      fields: structuredClone(existing.fields),
      isTemplate: existing.isTemplate,
    });
  }
}

export class DexieImportExportRepository implements ImportExportRepository {
  async exportAll(includePrivate: boolean): Promise<ExportBundle> {
    const db = getDb();
    const prompts = includePrivate
      ? await db.prompts.toArray()
      : (await db.prompts.toArray()).filter((prompt) => !prompt.isPrivate);

    return this.exportPrompts(
      prompts.map((prompt) => prompt.id),
      includePrivate,
    );
  }

  async exportPrompts(promptIds: string[], includePrivate: boolean): Promise<ExportBundle> {
    const db = getDb();
    const allPrompts = await db.prompts.bulkGet(promptIds);
    const prompts = allPrompts.filter(Boolean).filter((prompt) => includePrivate || !prompt!.isPrivate) as Prompt[];

    const promptIdSet = new Set(prompts.map((prompt) => prompt.id));
    const [categories, tags, promptTags, variableSchemas, versions, results] = await Promise.all([
      db.categories.toArray(),
      db.tags.toArray(),
      db.promptTags.toArray(),
      db.variableSchemas.toArray(),
      db.versions.toArray(),
      db.results.toArray(),
    ]);

    return {
      version: 2,
      exportedAt: now(),
      prompts,
      categories,
      tags,
      promptTags: promptTags.filter((item) => promptIdSet.has(item.promptId)),
      variableSchemas,
      versions: versions.filter((item) => promptIdSet.has(item.promptId)),
      results: results.filter((item) => promptIdSet.has(item.promptId)),
    };
  }

  async importBundle(bundle: ExportBundle, strategy: ImportConflictStrategy): Promise<{ imported: number; skipped: number }> {
    const db = getDb();
    let imported = 0;
    let skipped = 0;

    await db.transaction(
      "rw",
      [db.prompts, db.categories, db.tags, db.promptTags, db.variableSchemas, db.versions, db.results],
      async () => {
        const upsert = async <T extends { id: string }>(table: Table<T, string>, item: T) => {
          const existing = await table.get(item.id);
          if (existing && strategy === "skip") {
            skipped += 1;
            return;
          }

          if (existing && strategy === "rename") {
            const renamed = { ...item, id: generateId() };
            await table.add(renamed);
            imported += 1;
            return;
          }

          await table.put(item);
          imported += 1;
        };

        for (const category of bundle.categories) await upsert(db.categories, category);
        for (const tag of bundle.tags) {
          await upsert(db.tags, { ...tag, name: flattenTagName(tag.name) });
        }
        for (const schema of bundle.variableSchemas) await upsert(db.variableSchemas, schema);
        for (const prompt of bundle.prompts) await upsert(db.prompts, prompt);
        for (const promptTag of bundle.promptTags) await upsert(db.promptTags, promptTag);
        for (const version of bundle.versions) await upsert(db.versions, version);
        for (const result of bundle.results) await upsert(db.results, result);
      },
    );

    return { imported, skipped };
  }
}

export const promptRepository = new DexiePromptRepository();
export const categoryRepository = new DexieCategoryRepository();
export const tagRepository = new DexieTagRepository();
export const versionRepository = new DexieVersionRepository();
export const resultRepository = new DexieResultRepository();
export const schemaRepository = new DexieSchemaRepository();
export const importExportRepository = new DexieImportExportRepository();
