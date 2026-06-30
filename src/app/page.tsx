"use client";

import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePrompts } from "@/hooks/use-prompts";
import { promptRepository } from "@/lib/repositories/dexie-repositories";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { prompts, loading, refresh } = usePrompts();

  const favorites = prompts.filter((prompt) => prompt.isFavorite).slice(0, 5);
  const recent = [...prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleCreate = async () => {
    const prompt = await promptRepository.create({ title: "未命名 Prompt" });
    await refresh();
    router.push(`/prompts/${prompt.id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">本地 Prompt 工作台概览</p>
        </div>
        <Button onClick={() => void handleCreate()}>
          <Plus className="h-4 w-4" />
          新建 Prompt
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{loading ? "..." : prompts.length}</CardTitle>
            <CardDescription>Prompt 总数</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{favorites.length}</CardTitle>
            <CardDescription>收藏 Prompt</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{prompts.filter((prompt) => prompt.isPrivate).length}</CardTitle>
            <CardDescription>隐私 Prompt（需开启隐私模式可见）</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近更新</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">暂无 Prompt</p>}
            {recent.map((prompt) => (
              <Link key={prompt.id} href={`/prompts/${prompt.id}`} className="block rounded-lg border p-3 hover:bg-accent/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{prompt.title}</span>
                  {prompt.isFavorite && <Star className="h-4 w-4 fill-current text-yellow-500" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(prompt.updatedAt)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>收藏</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {favorites.length === 0 && <p className="text-sm text-muted-foreground">暂无收藏</p>}
            {favorites.map((prompt) => (
              <Link key={prompt.id} href={`/prompts/${prompt.id}`} className="block rounded-lg border p-3 hover:bg-accent/40">
                <div className="font-medium">{prompt.title}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {prompt.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
