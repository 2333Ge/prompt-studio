"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tagRepository } from "@/lib/repositories/dexie-repositories";
import { hasTagStyle, tagStyleToCss } from "@/lib/tag-style";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");

  const refresh = async () => {
    setTags(await tagRepository.getAll());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await tagRepository.create(name.trim());
    setName("");
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await tagRepository.delete(id);
    await refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="text-sm text-muted-foreground">管理扁平标签，可用于筛选和标记 Prompt</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新建标签</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="标签名称" />
          <Button onClick={() => void handleCreate()}>
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const styled = hasTagStyle(tag);
          return (
            <div
              key={tag.id}
              role="button"
              tabIndex={0}
              className={cn(
                "group inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-90",
                !styled && "border-transparent bg-secondary text-secondary-foreground",
              )}
              style={styled ? tagStyleToCss(tag.style) : undefined}
              onClick={() => router.push(`/tags/${tag.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/tags/${tag.id}`);
                }
              }}
            >
              <span>{tag.name}</span>
              <ConfirmPopover
                message="确定删除该标签吗？"
                onConfirm={() => void handleDelete(tag.id)}
              >
                <button
                  type="button"
                  className="rounded-sm p-0.5 opacity-40 transition-opacity hover:bg-black/10 hover:opacity-100 group-hover:opacity-70 dark:hover:bg-white/10"
                  aria-label={`删除 ${tag.name}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </ConfirmPopover>
            </div>
          );
        })}
      </div>
    </div>
  );
}
