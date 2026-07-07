import type { CSSProperties } from "react";
import type { Tag, TagStyle } from "@/types";

export const DEFAULT_TAG_STYLE: TagStyle = {};

export function hasTagStyle(tag: Pick<Tag, "style">): boolean {
  const style = tag.style;
  if (!style) return false;
  return Boolean(style.backgroundColor || style.textColor || style.borderColor);
}

export function tagStyleToCss(style?: TagStyle): CSSProperties {
  if (!style) return {};
  return {
    backgroundColor: style.backgroundColor,
    color: style.textColor,
    borderColor: style.borderColor ?? "transparent",
  };
}

export function normalizeHexColor(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return undefined;
}

export function sanitizeTagStyle(style?: TagStyle): TagStyle | undefined {
  if (!style) return undefined;
  const next: TagStyle = {
    backgroundColor: normalizeHexColor(style.backgroundColor ?? ""),
    textColor: normalizeHexColor(style.textColor ?? ""),
    borderColor: normalizeHexColor(style.borderColor ?? ""),
  };
  if (!next.backgroundColor && !next.textColor && !next.borderColor) {
    return undefined;
  }
  return next;
}
