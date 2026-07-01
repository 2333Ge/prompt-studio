export type VariableFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "date"
  | "image"
  | "flag";

export type VariableMorph = "inline" | "flag";

export type FlagValueType = "select" | "number" | "text";

export interface VariableFieldDefinition {
  type: VariableFieldType;
  title?: string;
  description?: string;
  required?: boolean;
  default?: string | number;
  options?: string[];
  /** CLI flag prefix, e.g. "--ar". Defaults to --{name} for flag fields. */
  flag?: string;
  /** Widget type when type is "flag". */
  valueType?: FlagValueType;
  omitIfDefault?: boolean;
  min?: number;
  max?: number;
  /** Chinese hint, e.g. "推荐 300，范围 0-1000" */
  hint?: string;
  inlineFlag?: boolean;
}

export interface VariableSchema {
  id: string;
  name: string;
  fields: Record<string, VariableFieldDefinition>;
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalVariableField {
  id: string;
  key: string;
  morph: VariableMorph;
  definition: VariableFieldDefinition;
  tags: string[];
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
  imageUrls?: string[];
  createdAt: string;
}

export interface PromptWithRelations extends Prompt {
  category?: Category | null;
  tags: Tag[];
  schema?: VariableSchema | null;
}

export type SortField = "updatedAt" | "lastUsedAt" | "rating" | "title";
export type SortOrder = "asc" | "desc";

export type PrivateFilter = "all" | "private" | "public";

export interface PromptQueryOptions {
  search?: string;
  categoryId?: string | null;
  tagIds?: string[];
  isFavorite?: boolean;
  minRating?: number;
  includePrivate?: boolean;
  privateFilter?: PrivateFilter;
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
  globalVariableFields?: GlobalVariableField[];
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
