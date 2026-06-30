const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function parseVariables(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]);
  }
  return Array.from(names);
}

export function findMissingVariables(content: string, defined: string[]): string[] {
  const parsed = parseVariables(content);
  const definedSet = new Set(defined);
  return parsed.filter((name) => !definedSet.has(name));
}

export function fillTemplate(content: string, values: Record<string, unknown>): string {
  return content.replace(VARIABLE_PATTERN, (_, name: string) => {
    const value = values[name];
    if (value == null) return `{{${name}}}`;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return String(value);
  });
}

export function createDefaultField(name: string) {
  return {
    type: "text" as const,
    title: name,
    required: false,
  };
}
