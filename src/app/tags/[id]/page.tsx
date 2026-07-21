"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { TagBadge } from "@/components/tag/tag-badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tagRepository } from "@/lib/repositories/dexie-repositories";
import { normalizeHexColor, sanitizeTagStyle } from "@/lib/tag-style";
import type { Tag, TagStyle } from "@/types";

type ColorField = keyof TagStyle;

const COLOR_FIELDS: { key: ColorField; label: string; fallback: string }[] = [
  { key: "backgroundColor", label: "底色", fallback: "#334155" },
  { key: "textColor", label: "文字颜色", fallback: "#f8fafc" },
  { key: "borderColor", label: "边框颜色", fallback: "#64748b" },
];

function ColorFieldRow({
  label,
  value,
  fallback,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const normalized = normalizeHexColor(value);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Label className="w-24 shrink-0">{label}</Label>
      {normalized ? (
        <input
          type="color"
          value={normalized}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
        />
      ) : (
        <button
          type="button"
          className="h-9 w-12 rounded border border-dashed border-input bg-muted"
          title="选择颜色"
          onClick={() => onChange(fallback)}
        />
      )}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#334155"
        className="font-mono"
      />
      <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={!value}>
        清除
      </Button>
    </div>
  );
}

export default function TagEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<TagStyle>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const loaded = await tagRepository.getById(params.id);
      if (!loaded) {
        setTag(null);
        setLoading(false);
        return;
      }
      setTag(loaded);
      setName(loaded.name);
      setStyle({
        backgroundColor: loaded.style?.backgroundColor ?? "",
        textColor: loaded.style?.textColor ?? "",
        borderColor: loaded.style?.borderColor ?? "",
      });
      setLoading(false);
    };
    void load();
  }, [params.id]);

  const previewTag = useMemo(
    () => ({
      name: name.trim() || "标签预览",
      style: sanitizeTagStyle(style),
    }),
    [name, style],
  );

  const updateStyleField = (key: ColorField, value: string) => {
    setStyle((current) => ({ ...current, [key]: value }));
  };

  const clearStyleField = (key: ColorField) => {
    setStyle((current) => ({ ...current, [key]: "" }));
  };

  const handleSave = async () => {
    if (!tag) return;
    setSaving(true);
    setError(null);
    try {
      await tagRepository.update(tag.id, {
        name: name.trim(),
        style: sanitizeTagStyle(style) ?? {},
      });
      router.push("/tags");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleResetStyle = () => {
    setStyle({
      backgroundColor: "",
      textColor: "",
      borderColor: "",
    });
  };

  const handleDelete = async () => {
    if (!tag) return;
    await tagRepository.delete(tag.id);
    router.push("/tags");
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">加载中...</div>;
  }

  if (!tag) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">标签不存在或已被删除。</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/tags">返回标签列表</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/tags">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">编辑标签</h1>
          <p className="text-sm text-muted-foreground">修改名称与展示样式</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">标签名称</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="标签名称"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">样式</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {COLOR_FIELDS.map((field) => (
            <ColorFieldRow
              key={field.key}
              label={field.label}
              value={style[field.key] ?? ""}
              fallback={field.fallback}
              onChange={(value) => updateStyleField(field.key, value)}
              onClear={() => clearStyleField(field.key)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">预览</CardTitle>
        </CardHeader>
        <CardContent>
          <TagBadge tag={previewTag} />
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} disabled={saving || !name.trim()}>
          保存
        </Button>
        <Button type="button" variant="outline" onClick={handleResetStyle}>
          恢复默认
        </Button>
        <ConfirmPopover message="确定删除该标签吗？" onConfirm={() => void handleDelete()}>
          <Button type="button" variant="destructive">
            删除标签
          </Button>
        </ConfirmPopover>
      </div>
    </div>
  );
}
