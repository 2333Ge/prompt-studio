import type { VariableFieldDefinition } from "@/types";

const INLINE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
const FLAG_PATTERN = /\[\[\s*([^\]]+?)\s*\]\]/g;

export function normalizeFlagKey(token: string): string {
  const trimmed = token.trim();
  return trimmed.startsWith("--") ? trimmed.slice(2) : trimmed;
}

export function parseInlineVariables(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(INLINE_PATTERN)) {
    names.add(match[1]);
  }
  return Array.from(names);
}

export function parseFlagVariables(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(FLAG_PATTERN)) {
    names.add(normalizeFlagKey(match[1]));
  }
  return Array.from(names);
}

/** All variable keys referenced in content (inline + flag, normalized). */
export function parseVariables(content: string): string[] {
  const names = new Set<string>();
  for (const name of parseInlineVariables(content)) names.add(name);
  for (const name of parseFlagVariables(content)) names.add(name);
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

function getFlagPrefix(name: string, field?: VariableFieldDefinition): string {
  if (field?.flag) return field.flag;
  return `--${name}`;
}

function shouldOmitFlag(
  value: unknown,
  field: VariableFieldDefinition | undefined,
): boolean {
  if (!field?.omitIfDefault || field.default === undefined) return false;
  const formatted = formatValue(value);
  if (formatted == null) return field.default === "" || field.default == null;
  return String(formatted) === String(field.default);
}

function formatFlagSegment(
  name: string,
  value: unknown,
  field?: VariableFieldDefinition,
): string | null {
  if (shouldOmitFlag(value, field)) return null;
  const formatted = formatValue(value);
  if (formatted == null) return null;
  const prefix = getFlagPrefix(name, field);
  return `${prefix} ${formatted}`;
}

export function buildVariablePlaceholder(key: string, morph: "inline" | "flag"): string {
  if (morph === "flag") return `[[ --${key} ]]`;
  return `{{${key}}}`;
}

export function fillTemplate(
  content: string,
  values: Record<string, unknown>,
  fields?: Record<string, VariableFieldDefinition>,
): string {
  let body = content.replace(INLINE_PATTERN, (_, name: string) => {
    const formatted = formatValue(values[name]);
    if (formatted == null) return `{{${name}}}`;
    return formatted;
  });

  const flagSegments: string[] = [];
  const inlineFlags: string[] = [];

  body = body.replace(FLAG_PATTERN, (_, rawToken: string) => {
    const name = normalizeFlagKey(rawToken);
    const field = fields?.[name];
    const segment = formatFlagSegment(name, values[name], field);
    if (segment == null) return "";

    if (field?.inlineFlag) {
      inlineFlags.push(segment);
      return segment;
    }

    flagSegments.push(segment);
    return "";
  });

  body = body.replace(/[ \t]+\n/g, "\n").replace(/  +/g, " ").trim();

  const trailingFlags = [...inlineFlags, ...flagSegments];
  if (trailingFlags.length === 0) return body;

  const flagBlock = trailingFlags.join(" ");
  if (!body) return flagBlock;
  return `${body} ${flagBlock}`;
}

export function createDefaultField(name: string, morph: "inline" | "flag" = "inline") {
  if (morph === "flag") {
    return {
      type: "flag" as const,
      title: name,
      required: false,
      valueType: "text" as const,
      flag: `--${name}`,
    };
  }
  return {
    type: "text" as const,
    title: name,
    required: false,
  };
}

export function inferVariableMorph(
  content: string,
  name: string,
): "inline" | "flag" {
  for (const match of content.matchAll(FLAG_PATTERN)) {
    if (normalizeFlagKey(match[1]) === name) return "flag";
  }
  return "inline";
}
