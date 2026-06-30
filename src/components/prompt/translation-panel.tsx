"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translateText } from "@/lib/translation";
import { useSettingsStore } from "@/lib/stores";

interface TranslationPanelProps {
  content: string;
}

export function TranslationPanel({ content }: TranslationPanelProps) {
  const provider = useSettingsStore((state) => state.translationProvider);
  const apiKey = useSettingsStore((state) => state.translationApiKey);
  const targetLanguage = useSettingsStore((state) => state.translationTargetLanguage);
  const iframeUrl = useSettingsStore((state) => state.translationIframeUrl);
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await translateText(content, {
        provider,
        apiKey,
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
          <CardTitle className="text-base">翻译辅助</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            翻译结果仅用于阅读辅助，不会写入数据库或创建版本。代码块、链接和变量占位符会被保护。
          </p>
          {provider !== "iframe" ? (
            <>
              <Button disabled={loading || !content} onClick={() => void handleTranslate()}>
                <Languages className="h-4 w-4" />
                {loading ? "翻译中..." : "翻译当前内容"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {translated && (
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
                  {translated}
                </pre>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">当前使用 iframe 模式，可在设置页配置第三方翻译页面。</p>
              <iframe title="Translation helper" src={iframeUrl} className="h-80 w-full rounded-lg border" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
