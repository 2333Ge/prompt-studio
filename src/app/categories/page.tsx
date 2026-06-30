"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { categoryRepository } from "@/lib/repositories/dexie-repositories";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const refresh = async () => {
    setCategories(await categoryRepository.getAll());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await categoryRepository.create(name.trim());
    setName("");
    await refresh();
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    await categoryRepository.update(id, editingName.trim());
    setEditingId(null);
    setEditingName("");
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("删除分类后，相关 Prompt 将变为未分类。继续吗？")) return;
    await categoryRepository.delete(id);
    await refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">管理 Prompt 的一级分类</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新建分类</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="分类名称" />
          <Button onClick={() => void handleCreate()}>
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              {editingId === category.id ? (
                <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
              ) : (
                <span className="font-medium">{category.name}</span>
              )}
              <div className="flex gap-2">
                {editingId === category.id ? (
                  <Button size="sm" onClick={() => void handleUpdate(category.id)}>
                    保存
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => void handleDelete(category.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
