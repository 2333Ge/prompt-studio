"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { usePrompts } from "@/hooks/use-prompts";
import { categoryRepository, promptRepository, tagRepository } from "@/lib/repositories/dexie-repositories";
import { usePrivacyStore, useUIStore } from "@/lib/stores";
import { formatDate } from "@/lib/utils";
import type { Category, PrivateFilter, Tag } from "@/types";
import { useEffect } from "react";

export default function PromptsPage() {
  const router = useRouter();
  const { prompts, loading, refresh } = usePrompts();
  const query = useUIStore((state) => state.query);
  const setQuery = useUIStore((state) => state.setQuery);
  const privacyModeEnabled = usePrivacyStore((state) => state.privacyModeEnabled);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchInput, setSearchInput] = useState(query.search ?? "");

  useEffect(() => {
    if (!privacyModeEnabled && query.privateFilter) {
      setQuery({ privateFilter: undefined });
    }
  }, [privacyModeEnabled, query.privateFilter, setQuery]);

  useEffect(() => {
    void Promise.all([categoryRepository.getAll(), tagRepository.getAll()]).then(([cats, tagList]) => {
      setCategories(cats);
      setTags(tagList);
    });
  }, []);

  const selectedTagId = query.tagIds?.[0];

  const handleCreate = async () => {
    const prompt = await promptRepository.create({ title: "未命名 Prompt" });
    await refresh();
    router.push(`/prompts/${prompt.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这个 Prompt 吗？")) return;
    await promptRepository.delete(id);
    await refresh();
  };

  const handleSearch = () => {
    setQuery({ search: searchInput.trim() || undefined });
  };

  const categoryName = useMemo(() => {
    if (!query.categoryId) return null;
    return categories.find((item) => item.id === query.categoryId)?.name;
  }, [categories, query.categoryId]);

  const privateFilterLabel = useMemo(() => {
    if (query.privateFilter === "private") return "仅隐私";
    if (query.privateFilter === "public") return "仅公开";
    return null;
  }, [query.privateFilter]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prompts</h1>
          <p className="text-sm text-muted-foreground">管理、搜索和筛选本地 Prompt</p>
        </div>
        <Button onClick={() => void handleCreate()}>
          <Plus className="h-4 w-4" />
          新建
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">搜索与筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="search">关键词</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                placeholder="搜索标题、备注、正文、标签..."
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>分类</Label>
            <Select
              value={query.categoryId ?? "all"}
              onValueChange={(value) => setQuery({ categoryId: value === "all" ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>标签</Label>
            <Select
              value={selectedTagId ?? "all"}
              onValueChange={(value) => setQuery({ tagIds: value === "all" ? undefined : [value] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标签</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>排序</Label>
            <Select
              value={query.sortBy ?? "updatedAt"}
              onValueChange={(value) =>
                setQuery({ sortBy: value as "updatedAt" | "lastUsedAt" | "rating" | "title" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">更新时间</SelectItem>
                <SelectItem value="lastUsedAt">最近使用</SelectItem>
                <SelectItem value="rating">评分</SelectItem>
                <SelectItem value="title">标题</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label htmlFor="favorite-only">仅收藏</Label>
            <Switch
              id="favorite-only"
              checked={Boolean(query.isFavorite)}
              onCheckedChange={(checked) => setQuery({ isFavorite: checked || undefined })}
            />
          </div>

          <div className="space-y-2">
            <Label>最低评分</Label>
            <Select
              value={String(query.minRating ?? 0)}
              onValueChange={(value) => setQuery({ minRating: Number(value) || undefined })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <SelectItem key={rating} value={String(rating)}>
                    {rating === 0 ? "不限" : `${rating} 星及以上`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {privacyModeEnabled && (
            <div className="space-y-2">
              <Label>隐私筛选</Label>
              <Select
                value={query.privateFilter ?? "all"}
                onValueChange={(value) =>
                  setQuery({ privateFilter: value === "all" ? undefined : (value as PrivateFilter) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="private">仅隐私 Prompt</SelectItem>
                  <SelectItem value="public">仅公开 Prompt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {(categoryName || query.isFavorite || query.search || privateFilterLabel) && (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {query.search && <Badge variant="outline">搜索: {query.search}</Badge>}
          {categoryName && <Badge variant="outline">分类: {categoryName}</Badge>}
          {query.isFavorite && <Badge variant="outline">仅收藏</Badge>}
          {privateFilterLabel && <Badge variant="outline">{privateFilterLabel}</Badge>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">暂无匹配的 Prompt</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/prompts/${prompt.id}`} className="text-lg font-medium hover:underline">
                      {prompt.title}
                    </Link>
                    {prompt.isFavorite && <Star className="h-4 w-4 fill-current text-yellow-500" />}
                    {prompt.isPrivate && <Badge variant="secondary">隐私</Badge>}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{prompt.content || "暂无内容"}</p>
                  <div className="flex flex-wrap gap-2">
                    {prompt.category && <Badge variant="outline">{prompt.category.name}</Badge>}
                    {prompt.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    更新于 {formatDate(prompt.updatedAt)}
                    {prompt.rating > 0 && ` · 评分 ${prompt.rating}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/prompts/${prompt.id}`}>编辑</Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => void handleDelete(prompt.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
