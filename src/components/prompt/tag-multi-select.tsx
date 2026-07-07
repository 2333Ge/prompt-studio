"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { TagBadge } from "@/components/tag/tag-badge";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

interface TagMultiSelectProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelectedTagIdsChange: (ids: string[]) => void;
  newTagNames: string[];
  onNewTagNamesChange: (names: string[]) => void;
  className?: string;
}

export function TagMultiSelect({
  tags,
  selectedTagIds,
  onSelectedTagIdsChange,
  newTagNames,
  onNewTagNamesChange,
  className,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds],
  );

  const filteredTags = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(keyword));
  }, [tags, search]);

  const searchTrimmed = search.trim();
  const canCreate =
    searchTrimmed.length > 0 &&
    !tags.some((tag) => tag.name.toLowerCase() === searchTrimmed.toLowerCase()) &&
    !newTagNames.some((name) => name.toLowerCase() === searchTrimmed.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectedTagIdsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onSelectedTagIdsChange([...selectedTagIds, tagId]);
    }
  };

  const removeNewTag = (name: string) => {
    onNewTagNamesChange(newTagNames.filter((item) => item !== name));
  };

  const addNewTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const existing = tags.find((tag) => tag.name.toLowerCase() === lower);
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        onSelectedTagIdsChange([...selectedTagIds, existing.id]);
      }
    } else if (!newTagNames.some((item) => item.toLowerCase() === lower)) {
      onNewTagNamesChange([...newTagNames, trimmed]);
    }
    setSearch("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (canCreate || searchTrimmed) {
        addNewTag(searchTrimmed);
      }
    } else if (event.key === "Backspace" && !search) {
      if (newTagNames.length > 0) {
        onNewTagNamesChange(newTagNames.slice(0, -1));
      } else if (selectedTagIds.length > 0) {
        onSelectedTagIdsChange(selectedTagIds.slice(0, -1));
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative min-w-[200px] flex-1", className)}>
      <div
        className={cn(
          "flex min-h-8 cursor-text flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm",
          open && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedTags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} onRemove={() => toggleTag(tag.id)} />
        ))}
        {newTagNames.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-0.5 rounded border border-dashed px-1.5 py-0.5 text-xs"
          >
            {name}
            <button
              type="button"
              className="rounded-sm hover:bg-muted"
              onClick={(event) => {
                event.stopPropagation();
                removeNewTag(name);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 && newTagNames.length === 0 ? "选择或输入标签" : ""}
          className="min-w-[80px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          className="shrink-0 text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
            if (!open) inputRef.current?.focus();
          }}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {canCreate && (
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => addNewTag(searchTrimmed)}
            >
              创建「{searchTrimmed}」
            </button>
          )}
          {filteredTags.length === 0 && !canCreate && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">无匹配标签</div>
          )}
          {filteredTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                  selected && "text-primary",
                )}
                onClick={() => toggleTag(tag.id)}
              >
                <TagBadge tag={tag} className="pointer-events-none" />
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
