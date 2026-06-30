"use client";

import { useRef, useState } from "react";
import { Download, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { importExportRepository } from "@/lib/repositories/dexie-repositories";
import { usePrivacyStore, useSettingsStore } from "@/lib/stores";
import type { ExportBundle, ImportConflictStrategy } from "@/types";

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    privacyModeEnabled,
    showPrivacyToggle,
    togglePrivacyMode,
    registerSecretTap,
    secretTapCount,
  } = usePrivacyStore();
  const {
    translationProvider,
    translationApiKey,
    translationTargetLanguage,
    translationIframeUrl,
    setTranslationProvider,
    setTranslationApiKey,
    setTranslationTargetLanguage,
    setTranslationIframeUrl,
  } = useSettingsStore();
  const [importStrategy, setImportStrategy] = useState<ImportConflictStrategy>("skip");
  const [message, setMessage] = useState("");

  const handleExport = async () => {
    const bundle = await importExportRepository.exportAll(privacyModeEnabled);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prompt-studio-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("导出完成");
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const bundle = JSON.parse(text) as ExportBundle;
    const result = await importExportRepository.importBundle(bundle, importStrategy);
    setMessage(`导入完成：${result.imported} 条写入，${result.skipped} 条跳过`);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">隐私模式、导入导出与翻译配置</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            隐私模式
          </CardTitle>
          <CardDescription>
            连续点击顶部 Logo 10 次可显示隐私开关。开启后可查看、编辑和导出标记为隐私的 Prompt。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="font-medium">隐私模式</p>
              <p className="text-sm text-muted-foreground">
                {showPrivacyToggle ? "开关已解锁" : "开关尚未解锁，请连点 Logo"}
              </p>
            </div>
            <Switch
              checked={privacyModeEnabled}
              disabled={!showPrivacyToggle}
              onCheckedChange={togglePrivacyMode}
            />
          </div>
          {!showPrivacyToggle && (
            <Button variant="outline" onClick={registerSecretTap}>
              连点解锁隐私开关 ({secretTapCount}/10)
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">导入 / 导出</CardTitle>
          <CardDescription>JSON 格式完整迁移 Prompt、版本、结果、分类和标签。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>冲突策略</Label>
            <Select value={importStrategy} onValueChange={(value) => setImportStrategy(value as ImportConflictStrategy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">跳过重复项</SelectItem>
                <SelectItem value="overwrite">覆盖重复项</SelectItem>
                <SelectItem value="rename">重命名导入</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出 JSON
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              导入 JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">翻译配置</CardTitle>
          <CardDescription>翻译结果不会保存到 Prompt 或版本历史。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={translationProvider} onValueChange={(value) => setTranslationProvider(value as typeof translationProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iframe">iframe 三方页面</SelectItem>
                <SelectItem value="deepl">DeepL API</SelectItem>
                <SelectItem value="google">Google Translate API</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {translationProvider !== "iframe" && (
            <>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input value={translationApiKey} onChange={(event) => setTranslationApiKey(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>目标语言</Label>
                <Input
                  value={translationTargetLanguage}
                  onChange={(event) => setTranslationTargetLanguage(event.target.value)}
                  placeholder="如 EN / zh-CN"
                />
              </div>
            </>
          )}
          {translationProvider === "iframe" && (
            <div className="space-y-2">
              <Label>iframe URL</Label>
              <Input value={translationIframeUrl} onChange={(event) => setTranslationIframeUrl(event.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
