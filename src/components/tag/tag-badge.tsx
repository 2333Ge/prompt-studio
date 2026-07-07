import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hasTagStyle, tagStyleToCss } from "@/lib/tag-style";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

interface TagBadgeProps {
  tag: Pick<Tag, "name" | "style">;
  className?: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, className, onRemove }: TagBadgeProps) {
  if (!hasTagStyle(tag)) {
    return (
      <Badge variant="secondary" className={cn(onRemove && "gap-0.5 pr-1", className)}>
        {tag.name}
        {onRemove ? (
          <button
            type="button"
            className="rounded-sm hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </Badge>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        onRemove && "gap-0.5 pr-1",
        className,
      )}
      style={tagStyleToCss(tag.style)}
    >
      {tag.name}
      {onRemove ? (
        <button
          type="button"
          className="rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}
