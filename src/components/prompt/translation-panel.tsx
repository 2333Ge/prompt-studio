"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEnvApiKey, resolveTextModel, TRANSLATION_LANGUAGES } from "@/lib/siliconflow/models";
import { translateText } from "@/lib/translation";
import { useSettingsStore } from "@/lib/stores";

interface TranslationPanelProps {
  content: string;
}

export function TranslationPanel({ content }: TranslationPanelProps) {
  const storedApiKey = useSettingsStore((state) => state.siliconflowApiKey);
  const textModel = useSettingsStore((state) => state.siliconflowTextModel);
  const apiKey = storedApiKey || getEnvApiKey();
  const targetLanguage = useSettingsStore((state) => state.translationTargetLanguage);
  const setTranslationTargetLanguage = useSettingsStore((state) => state.setTranslationTargetLanguage);
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await translateText(content, {
        apiKey,
        model: resolveTextModel(textModel),
        targetLanguage,
      });
      setTranslated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 翻译（硅基流动）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            翻译结果仅用于阅读辅助，不会写入数据库或创建版本。代码块、链接和变量占位符会被保护。
          </p>

          <div className="space-y-2">
            <Label>目标语言</Label>
            <Select value={targetLanguage} onValueChange={setTranslationTargetLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button disabled={loading || !content} onClick={() => void handleTranslate()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
            {loading ? "翻译中..." : "翻译当前内容"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {translated && (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
              {translated}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
