export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

/** 已下线模型 → 自动迁移到可用模型 */
export const DISABLED_MODEL_IDS = new Set([
  "deepseek-ai/deepseek-vl2",
  "Qwen/Qwen2.5-7B-Instruct",
  "Pro/Qwen/Qwen2.5-7B-Instruct",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
  "Pro/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
  "Qwen/Qwen2-VL-7B-Instruct",
  "Pro/Qwen/Qwen2-VL-7B-Instruct",
  "Pro/Qwen/Qwen2.5-VL-7B-Instruct",
  "Qwen/Qwen2.5-VL-72B-Instruct",
  "Qwen/Qwen2.5-VL-32B-Instruct",
  "Qwen/Qwen2-VL-72B-Instruct",
  "deepseek-ai/DeepSeek-V3",
  "zai-org/GLM-4.6V",
]);

export const TEXT_MODELS: ModelOption[] = [
  {
    id: "Qwen/Qwen3-8B",
    label: "Qwen3-8B",
    hint: "免费 · 推荐",
  },
  {
    id: "deepseek-ai/DeepSeek-V3.2",
    label: "DeepSeek-V3.2",
    hint: "低价 · 质量更好",
  },
  {
    id: "Qwen/Qwen3.5-35B-A3B",
    label: "Qwen3.5-35B-A3B",
    hint: "MoE · 性价比高",
  },
  {
    id: "Qwen/Qwen3.6-35B-A3B",
    label: "Qwen3.6-35B-A3B",
    hint: "MoE · 较新",
  },
];

export const DEFAULT_TEXT_MODEL = TEXT_MODELS[0].id;

export const TRANSLATION_LANGUAGES = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number]["value"];

export function getEnvApiKey(): string {
  return process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY?.trim() ?? "";
}

export function resolveTextModel(saved?: string): string {
  if (!saved || DISABLED_MODEL_IDS.has(saved)) return DEFAULT_TEXT_MODEL;
  return saved;
}

export function isModelDisabledError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("model disabled") ||
    lower.includes("model is disabled") ||
    lower.includes("模型已下线") ||
    lower.includes("not found")
  );
}
