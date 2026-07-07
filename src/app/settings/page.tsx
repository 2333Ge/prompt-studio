"use client";

import { useRef, useState } from "react";
import { Download, Shield, ShieldOff, Upload } from "lucide-react";
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
import { importExportRepository } from "@/lib/repositories/dexie-repositories";
import { getEnvApiKey, resolveTextModel, TEXT_MODELS } from "@/lib/siliconflow/models";
import { usePrivacyStore, useSettingsStore } from "@/lib/stores";
import type { ExportBundle, ImportConflictStrategy } from "@/types";

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const passwordHash = usePrivacyStore((state) => state.passwordHash);
  const disablePrivacyMode = usePrivacyStore((state) => state.disablePrivacyMode);
  const openPasswordDialog = usePrivacyStore((state) => state.openPasswordDialog);
  const {
    siliconflowApiKey,
    siliconflowTextModel,
    setSiliconflowApiKey,
    setSiliconflowTextModel,
  } = useSettingsStore();
  const envApiKey = getEnvApiKey();
  const displayApiKey = siliconflowApiKey || envApiKey;
  const keyFromEnv = Boolean(envApiKey) && displayApiKey === envApiKey;
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
        <p className="text-sm text-muted-foreground">导入导出、隐私模式与翻译配置</p>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {privacyModeEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              隐私模式
            </CardTitle>
            <CardDescription>隐私模式已开启，可查看和管理标记为隐私的 Prompt。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <p>在 Prompts 页面可使用「隐私筛选」快速定位隐私内容。</p>
              <p className="mt-1">导出 JSON 时会包含隐私 Prompt；关闭隐私模式后导出将自动排除隐私内容。</p>
            </div>
            <Button variant="outline" onClick={disablePrivacyMode}>
              <ShieldOff className="h-4 w-4" />
              关闭隐私模式
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              隐私模式
            </CardTitle>
            <CardDescription>
              {passwordHash
                ? "隐私模式当前已关闭。连续点击顶部 Logo 10 次并输入密码可重新开启。"
                : "隐私模式尚未初始化。连续点击顶部 Logo 10 次可设置密码并开启。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={openPasswordDialog}>
              <Shield className="h-4 w-4" />
              开启隐私模式
            </Button>
          </CardContent>
        </Card>
      )}

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
          <CardTitle className="text-base">AI 翻译（硅基流动）</CardTitle>
          <CardDescription>
            翻译结果不会保存到 Prompt 或版本历史。目标语言在 Prompt 编辑页的「翻译」面板中配置。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>硅基流动 API Key</Label>
            <Input
              type="password"
              value={displayApiKey}
              onChange={(event) => setSiliconflowApiKey(event.target.value)}
              placeholder="sk-..."
              readOnly={keyFromEnv}
            />
            <p className="text-xs text-muted-foreground">
              {keyFromEnv
                ? "已从环境变量 NEXT_PUBLIC_SILICONFLOW_API_KEY 读取"
                : "Key 仅保存在本地浏览器，不会上传到服务器。"}
            </p>
          </div>
          <div className="space-y-2">
            <Label>翻译模型</Label>
            <Select value={resolveTextModel(siliconflowTextModel)} onValueChange={setSiliconflowTextModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label} — {model.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
