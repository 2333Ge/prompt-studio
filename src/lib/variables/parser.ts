import type { VariableFieldDefinition } from "@/types";

const VARIABLE_TOKEN = /[\p{L}_][\p{L}\p{N}_-]*/u;
const INLINE_PATTERN = new RegExp(`\\{\\{\\s*(${VARIABLE_TOKEN.source})\\s*\\}\\}`, "gu");

export function parseVariableToken(raw: string): string {
  return raw.trim();
}

export function parseVariables(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(INLINE_PATTERN)) {
    names.add(parseVariableToken(match[1]));
  }
  return Array.from(names);
}

export function findMissingVariables(content: string, defined: string[]): string[] {
  const parsed = parseVariables(content);
  const definedSet = new Set(defined);
  return parsed.filter((name) => !definedSet.has(name));
}

function formatValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

function joinPrefixAndValue(prefix: string, formatted: string): string {
  if (!prefix) return formatted;
  if (/\s$/.test(prefix)) return `${prefix}${formatted}`;
  return `${prefix} ${formatted}`;
}

function formatPrefixedSegment(value: unknown, prefix: string): string | null {
  const formatted = formatValue(value);
  if (formatted == null) return null;
  return joinPrefixAndValue(prefix, formatted);
}

export function buildVariablePlaceholder(key: string): string {
  return `{{${key}}}`;
}

export function fillTemplate(
  content: string,
  values: Record<string, unknown>,
  fields?: Record<string, VariableFieldDefinition>,
): string {
  let body = content.replace(INLINE_PATTERN, (_, rawToken: string) => {
    const key = parseVariableToken(rawToken);
    const field = fields?.[key];

    if (field?.prefixEnabled && field.prefix) {
      const segment = formatPrefixedSegment(values[key], field.prefix);
      if (segment == null) return "";
      return segment;
    }

    const formatted = formatValue(values[key]);
    if (formatted == null) return `{{${key}}}`;
    return formatted;
  });

  return body.replace(/[ \t]+\n/g, "\n").replace(/  +/g, " ").trim();
}

export function createDefaultField(name: string): VariableFieldDefinition {
  return {
    type: "text",
    title: name,
    required: false,
  };
}
