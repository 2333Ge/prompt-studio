import Dexie, { type Table } from "dexie";
import type {
  Category,
  Prompt,
  PromptResult,
  PromptTag,
  PromptVersion,
  Tag,
  VariableSchema,
} from "@/types";

export class PromptStudioDB extends Dexie {
  prompts!: Table<Prompt, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  promptTags!: Table<PromptTag, string>;
  variableSchemas!: Table<VariableSchema, string>;
  versions!: Table<PromptVersion, string>;
  results!: Table<PromptResult, string>;

  constructor() {
    super("PromptStudioDB");

    this.version(1).stores({
      prompts:
        "id, title, categoryId, isFavorite, isPrivate, rating, updatedAt, lastUsedAt, schemaId, currentVersionId",
      categories: "id, name, updatedAt",
      tags: "id, name",
      promptTags: "id, promptId, tagId, [promptId+tagId]",
      variableSchemas: "id, name, updatedAt",
      versions: "id, promptId, createdAt",
      results: "id, promptId, modelName, createdAt",
    });

    this.version(2).stores({
      prompts:
        "id, title, categoryId, isFavorite, isPrivate, rating, updatedAt, lastUsedAt, schemaId, currentVersionId",
      categories: "id, name, updatedAt",
      tags: "id, name",
      promptTags: "id, promptId, tagId, [promptId+tagId]",
      variableSchemas: "id, name, updatedAt, isTemplate",
      globalVariableFields: "id, key, updatedAt",
      versions: "id, promptId, createdAt",
      results: "id, promptId, modelName, createdAt",
    });

    this.version(3).stores({
      prompts:
        "id, title, categoryId, isFavorite, isPrivate, rating, updatedAt, lastUsedAt, schemaId, currentVersionId",
      categories: "id, name, updatedAt",
      tags: "id, name",
      promptTags: "id, promptId, tagId, [promptId+tagId]",
      variableSchemas: "id, name, updatedAt, isTemplate",
      versions: "id, promptId, createdAt",
      results: "id, promptId, modelName, createdAt",
    });
  }
}

let dbInstance: PromptStudioDB | null = null;

export function getDb(): PromptStudioDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }

  if (!dbInstance) {
    dbInstance = new PromptStudioDB();
  }

  return dbInstance;
}
