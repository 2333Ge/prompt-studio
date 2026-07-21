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
  /** 是否启用前缀输出 */
  prefixEnabled?: boolean;
  /** 手动输入的前缀，如 "--ar " */
  prefix?: string;
  min?: number;
  max?: number;
  /** Chinese hint, e.g. "推荐 300，范围 0-1000" */
  hint?: string;
}

export interface VariableSchema {
  id: string;
  name: string;
  fields: Record<string, VariableFieldDefinition>;
  isTemplate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  style?: TagStyle;
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
  /** 变量面板中填写的测试值，按 prompt 持久化 */
  variableValues?: Record<string, unknown>;
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
  versions: PromptVersion[];
  results: PromptResult[];
}

export type ImportConflictStrategy = "skip" | "overwrite" | "rename";

export interface TranslationSettings {
  apiKey: string;
  textModel: string;
  targetLanguage: string;
}

export interface AppSettings {
  translation: TranslationSettings;
}
