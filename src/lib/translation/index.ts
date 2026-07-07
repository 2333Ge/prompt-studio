import {
  DEFAULT_TEXT_MODEL,
  isModelDisabledError,
  type TranslationLanguage,
} from "@/lib/siliconflow/models";

const BASE_URL = "https://api.siliconflow.cn/v1";

interface ProtectedSegment {
  token: string;
  value: string;
}

export function protectSegments(text: string): { protectedText: string; segments: ProtectedSegment[] } {
  const segments: ProtectedSegment[] = [];
  let index = 0;

  const protect = (value: string) => {
    const token = `__PS_PROTECT_${index++}__`;
    segments.push({ token, value });
    return token;
  };

  let protectedText = text;

  protectedText = protectedText.replace(/```[\s\S]*?```/g, (match) => protect(match));
  protectedText = protectedText.replace(/`[^`\n]+`/g, (match) => protect(match));
  protectedText = protectedText.replace(/\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/g, (match) => protect(match));
  protectedText = protectedText.replace(/https?:\/\/[^\s)]+/g, (match) => protect(match));

  return { protectedText, segments };
}

export function restoreSegments(text: string, segments: ProtectedSegment[]): string {
  return segments.reduce((result, segment) => result.replaceAll(segment.token, segment.value), text);
}

function buildSystemPrompt(targetLanguage: string): string {
  return `你是专业的翻译助手。将用户提供的文本翻译成「${targetLanguage}」。
规则：
1. 保持原文格式、换行和段落结构
2. 形如 __PS_PROTECT_数字__ 的占位符必须原样保留，不得修改、翻译或删除
3. 只输出翻译后的正文，不要添加解释、标题或前缀`;
}

function formatApiError(status: number, message: string, model: string): Error {
  if (isModelDisabledError(message)) {
    return new Error(`模型「${model}」已下线或未开通。请在设置页更换翻译模型。`);
  }
  return new Error(message || `API 错误 (${status})`);
}

export async function translateText(
  text: string,
  options: {
    apiKey: string;
    model?: string;
    targetLanguage: TranslationLanguage | string;
  },
): Promise<string> {
  if (!options.apiKey) {
    throw new Error("请先在设置中填写硅基流动 API Key");
  }

  if (!text.trim()) {
    throw new Error("没有可翻译的内容");
  }

  const model = options.model || DEFAULT_TEXT_MODEL;
  const { protectedText, segments } = protectSegments(text);
  const languageLabel =
    options.targetLanguage === "zh-CN"
      ? "简体中文"
      : options.targetLanguage === "zh-TW"
        ? "繁体中文"
        : options.targetLanguage;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(languageLabel) },
        { role: "user", content: protectedText },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    let message = "";
    try {
      const body = (await response.json()) as { message?: string; error?: { message?: string } };
      message = body.message ?? body.error?.message ?? "";
    } catch {
      // ignore parse error
    }
    throw formatApiError(response.status, message, model);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("翻译结果为空");
  }

  return restoreSegments(raw, segments);
}
