export type VariableFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "date"
  | "image";

export interface VariableFieldDefinition {
  type: VariableFieldType;
  title?: string;
  description?: string;
  required?: boolean;
  default?: string | number;
  options?: string[];
}

export interface VariableSchema {
  id: string;
  name: string;
  fields: Record<string, VariableFieldDefinition>;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface PromptTag {
  id: string;
  promptId: string;
  tagId: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  notes: string;
  categoryId: string | null;
  rating: number;
  isFavorite: boolean;
  isPrivate: boolean;
  schemaId: string | null;
  currentVersionId: string | null;
  mediaRefs: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  content: string;
  schemaSnapshot: string;
  note: string;
  createdAt: string;
}

export interface PromptResult {
  id: string;
  promptId: string;
  modelName: string;
  content: string;
  note: string;
  createdAt: string;
}

export interface PromptWithRelations extends Prompt {
  category?: Category | null;
  tags: Tag[];
  schema?: VariableSchema | null;
}

export type SortField = "updatedAt" | "lastUsedAt" | "rating" | "title";
export type SortOrder = "asc" | "desc";

export interface PromptQueryOptions {
  search?: string;
  categoryId?: string | null;
  tagIds?: string[];
  isFavorite?: boolean;
  minRating?: number;
  includePrivate?: boolean;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface ExportBundle {
  version: number;
  exportedAt: string;
  prompts: Prompt[];
  categories: Category[];
  tags: Tag[];
  promptTags: PromptTag[];
  variableSchemas: VariableSchema[];
  versions: PromptVersion[];
  results: PromptResult[];
}

export type ImportConflictStrategy = "skip" | "overwrite" | "rename";

export interface TranslationSettings {
  provider: "deepl" | "google" | "iframe";
  apiKey: string;
  targetLanguage: string;
  iframeUrl: string;
}

export interface AppSettings {
  translation: TranslationSettings;
}
