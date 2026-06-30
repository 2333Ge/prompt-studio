"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tagRepository } from "@/lib/repositories/dexie-repositories";
import type { Tag } from "@/types";

export default function TagsPage() {
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
    if (!confirm("确定删除该标签吗？")) return;
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
        {tags.map((tag) => (
          <Card key={tag.id} className="inline-flex">
            <CardContent className="flex items-center gap-2 p-3">
              <span>{tag.name}</span>
              <Button size="icon" variant="ghost" onClick={() => void handleDelete(tag.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
