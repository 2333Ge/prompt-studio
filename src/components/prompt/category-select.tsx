"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategorySelectProps {
  categories: Category[];
  categoryId: string | null;
  onCategoryIdChange: (id: string | null) => void;
  newCategoryName: string | null;
  onNewCategoryNameChange: (name: string | null) => void;
  className?: string;
}

export function CategorySelect({
  categories,
  categoryId,
  onCategoryIdChange,
  newCategoryName,
  onNewCategoryNameChange,
  className,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(keyword));
  }, [categories, search]);

  const searchTrimmed = search.trim();
  const canCreate =
    searchTrimmed.length > 0 &&
    !categories.some((category) => category.name.toLowerCase() === searchTrimmed.toLowerCase()) &&
    newCategoryName?.toLowerCase() !== searchTrimmed.toLowerCase();

  const hasSelection = Boolean(selectedCategory || newCategoryName);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const clearSelection = () => {
    onCategoryIdChange(null);
    onNewCategoryNameChange(null);
  };

  const selectCategory = (id: string) => {
    if (categoryId === id) {
      clearSelection();
    } else {
      onCategoryIdChange(id);
      onNewCategoryNameChange(null);
    }
    setSearch("");
    setOpen(false);
  };

  const addNewCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const existing = categories.find((category) => category.name.toLowerCase() === lower);
    if (existing) {
      onCategoryIdChange(existing.id);
      onNewCategoryNameChange(null);
    } else {
      onCategoryIdChange(null);
      onNewCategoryNameChange(trimmed);
    }
    setSearch("");
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (canCreate || searchTrimmed) {
        addNewCategory(searchTrimmed);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block flex-none self-start", className)}>
      <div
        role="combobox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border bg-background px-2 text-sm",
          open && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
        onClick={() => setOpen((value) => !value)}
      >
        {selectedCategory ? (
          <span className="inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-xs">
            <span className="max-w-[200px] truncate">{selectedCategory.name}</span>
            <button
              type="button"
              className="rounded-sm hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                clearSelection();
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : newCategoryName ? (
          <span className="inline-flex items-center gap-0.5 rounded border border-dashed px-1.5 py-0.5 text-xs">
            <span className="max-w-[200px] truncate">{newCategoryName}</span>
            <button
              type="button"
              className="rounded-sm hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                clearSelection();
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : (
          <span className="text-muted-foreground">选择或输入分类</span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </div>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-56 overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="border-b p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索或输入分类"
              className="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-auto p-1">
            {canCreate && (
              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => addNewCategory(searchTrimmed)}
              >
                创建「{searchTrimmed}」
              </button>
            )}
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                !hasSelection && "text-primary",
              )}
              onClick={() => {
                clearSelection();
                setSearch("");
                setOpen(false);
              }}
            >
              <span>未分类</span>
              {!hasSelection && <Check className="h-4 w-4" />}
            </button>
            {filteredCategories.length === 0 && !canCreate && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">无匹配分类</div>
            )}
            {filteredCategories.map((category) => {
              const selected = categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    selected && "text-primary",
                  )}
                  onClick={() => selectCategory(category.id)}
                >
                  <span>{category.name}</span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
