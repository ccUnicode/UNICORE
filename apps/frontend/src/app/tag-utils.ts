export function cleanTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTag(value: string): string {
  return cleanTag(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function canonicalizeTags(
  values: string[],
  suggestions: string[] = [],
): string[] {
  const canonicalSuggestions = new Map<string, string>();
  suggestions.forEach((suggestion) => {
    const cleaned = cleanTag(suggestion);
    const normalized = normalizeTag(cleaned);
    if (normalized && !canonicalSuggestions.has(normalized)) {
      canonicalSuggestions.set(normalized, cleaned);
    }
  });

  const unique = new Map<string, string>();
  values.forEach((value) => {
    const cleaned = cleanTag(value);
    const normalized = normalizeTag(cleaned);
    if (normalized && !unique.has(normalized)) {
      unique.set(normalized, canonicalSuggestions.get(normalized) ?? cleaned);
    }
  });
  return [...unique.values()];
}

export function validateTag(
  value: string,
  maxLength: number,
): string | undefined {
  const cleaned = cleanTag(value);
  if (!cleaned) return "Escribe una etiqueta antes de agregarla.";
  if (cleaned.length > maxLength) {
    return `Cada etiqueta puede tener hasta ${maxLength} caracteres.`;
  }
  if (/[\u0000-\u001f\u007f]/.test(cleaned)) {
    return "La etiqueta contiene caracteres no permitidos.";
  }
  return undefined;
}

export function editingIndexAfterRemoval(
  editingIndex: number | null,
  removedIndex: number,
): number | null {
  if (editingIndex === null || removedIndex > editingIndex) {
    return editingIndex;
  }
  return removedIndex === editingIndex ? null : editingIndex - 1;
}

export function matchingTagSuggestions(
  query: string,
  suggestions: string[],
  selected: string[],
): string[] {
  const normalizedQuery = normalizeTag(query);
  const selectedValues = new Set(selected.map(normalizeTag));
  return canonicalizeTags(suggestions)
    .filter((suggestion) => !selectedValues.has(normalizeTag(suggestion)))
    .filter(
      (suggestion) =>
        !normalizedQuery || normalizeTag(suggestion).includes(normalizedQuery),
    )
    .slice(0, 6);
}
