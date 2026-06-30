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

export async function translateText(
  text: string,
  options: {
    provider: "deepl" | "google" | "iframe";
    apiKey?: string;
    targetLanguage?: string;
  },
): Promise<string> {
  if (options.provider === "iframe") {
    return text;
  }

  const { protectedText, segments } = protectSegments(text);

  if (options.provider === "deepl" && options.apiKey) {
    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${options.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text: protectedText,
        target_lang: options.targetLanguage ?? "EN",
      }),
    });

    if (!response.ok) {
      throw new Error("DeepL translation failed");
    }

    const data = (await response.json()) as { translations: { text: string }[] };
    return restoreSegments(data.translations[0]?.text ?? protectedText, segments);
  }

  if (options.provider === "google" && options.apiKey) {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${options.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: protectedText,
          target: (options.targetLanguage ?? "en").toLowerCase(),
          format: "text",
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Google translation failed");
    }

    const data = (await response.json()) as { data: { translations: { translatedText: string }[] } };
    return restoreSegments(data.data.translations[0]?.translatedText ?? protectedText, segments);
  }

  return text;
}
