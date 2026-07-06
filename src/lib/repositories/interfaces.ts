import type {
  Category,
  ExportBundle,
  GlobalVariableField,
  ImportConflictStrategy,
  Prompt,
  PromptQueryOptions,
  PromptResult,
  PromptVersion,
  PromptWithRelations,
  Tag,
  VariableSchema,
} from "@/types";

export interface PromptRepository {
  getById(id: string, includePrivate?: boolean): Promise<PromptWithRelations | null>;
  query(options?: PromptQueryOptions): Promise<PromptWithRelations[]>;
  create(input: Partial<Prompt> & Pick<Prompt, "title">): Promise<PromptWithRelations>;
  update(id: string, input: Partial<Prompt>): Promise<PromptWithRelations>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<PromptWithRelations>;
  setTags(promptId: string, tagIds: string[]): Promise<void>;
  touchLastUsed(id: string): Promise<void>;
  countBySchemaId(schemaId: string): Promise<number>;
}

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  create(name: string): Promise<Category>;
  update(id: string, name: string): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface TagRepository {
  getAll(): Promise<Tag[]>;
  create(name: string): Promise<Tag>;
  delete(id: string): Promise<void>;
  findOrCreate(names: string[]): Promise<Tag[]>;
}

export interface VersionRepository {
  getByPromptId(promptId: string): Promise<PromptVersion[]>;
  create(input: Omit<PromptVersion, "id" | "createdAt">): Promise<PromptVersion>;
  getById(id: string): Promise<PromptVersion | null>;
  delete(id: string): Promise<void>;
}

export interface ResultRepository {
  getByPromptId(promptId: string): Promise<PromptResult[]>;
  create(input: Omit<PromptResult, "id" | "createdAt">): Promise<PromptResult>;
  delete(id: string): Promise<void>;
}

export interface SchemaRepository {
  getById(id: string): Promise<VariableSchema | null>;
  getAll(): Promise<VariableSchema[]>;
  getTemplates(): Promise<VariableSchema[]>;
  create(input: Pick<VariableSchema, "name" | "fields"> & Partial<Pick<VariableSchema, "isTemplate">>): Promise<VariableSchema>;
  update(id: string, input: Partial<Pick<VariableSchema, "name" | "fields" | "isTemplate">>): Promise<VariableSchema>;
  delete(id: string): Promise<void>;
  clone(id: string, name?: string): Promise<VariableSchema>;
}

export interface GlobalVariableFieldRepository {
  getAll(): Promise<GlobalVariableField[]>;
  getById(id: string): Promise<GlobalVariableField | null>;
  getByKey(key: string): Promise<GlobalVariableField | null>;
  create(input: Pick<GlobalVariableField, "key" | "definition"> & Partial<Pick<GlobalVariableField, "tags">>): Promise<GlobalVariableField>;
  update(id: string, input: Partial<Pick<GlobalVariableField, "key" | "definition" | "tags">>): Promise<GlobalVariableField>;
  delete(id: string): Promise<void>;
}

export interface ImportExportRepository {
  exportAll(includePrivate: boolean): Promise<ExportBundle>;
  exportPrompts(promptIds: string[], includePrivate: boolean): Promise<ExportBundle>;
  importBundle(bundle: ExportBundle, strategy: ImportConflictStrategy): Promise<{ imported: number; skipped: number }>;
}
