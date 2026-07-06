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

function shouldOmitValue(value: unknown, field: VariableFieldDefinition | undefined): boolean {
  if (!field?.omitIfDefault || field.default === undefined) return false;
  const formatted = formatValue(value);
  if (formatted == null) return field.default === "" || field.default == null;
  return String(formatted) === String(field.default);
}

function formatPrefixedSegment(
  value: unknown,
  field: VariableFieldDefinition | undefined,
  prefix: string,
): string | null {
  if (shouldOmitValue(value, field)) return null;
  const formatted = formatValue(value);
  if (formatted == null) return null;
  return `${prefix}${formatted}`;
}

export function buildVariablePlaceholder(key: string): string {
  return `{{${key}}}`;
}

export function fillTemplate(
  content: string,
  values: Record<string, unknown>,
  fields?: Record<string, VariableFieldDefinition>,
): string {
  const trailingSegments: string[] = [];

  let body = content.replace(INLINE_PATTERN, (_, rawToken: string) => {
    const key = parseVariableToken(rawToken);
    const field = fields?.[key];

    if (field?.prefixEnabled && field.prefix) {
      const segment = formatPrefixedSegment(values[key], field, field.prefix);
      if (segment == null) return "";
      if (field.inlinePrefix) return segment;
      trailingSegments.push(segment);
      return "";
    }

    const formatted = formatValue(values[key]);
    if (formatted == null) return `{{${key}}}`;
    return formatted;
  });

  body = body.replace(/[ \t]+\n/g, "\n").replace(/  +/g, " ").trim();

  if (trailingSegments.length === 0) return body;

  const suffix = trailingSegments.join(" ");
  if (!body) return suffix;
  return `${body} ${suffix}`;
}

export function createDefaultField(name: string): VariableFieldDefinition {
  return {
    type: "text",
    title: name,
    required: false,
  };
}
